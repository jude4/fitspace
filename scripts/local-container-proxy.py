"""Preserve managed proxies, adding only this local stack's internal destinations.

Some managed Docker images inject proxy settings into every container. Supabase
health checks use 0.0.0.0, and Auth downloads templates from its local Kong peer.
Recreate ONLY this checkout's development containers with local NO_PROXY entries.
No proxy address, external destination rule, credentials or volume is changed.
"""
import http.client, json, socket, subprocess
API_VERSION=subprocess.check_output(['docker','version','--format','{{.Server.APIVersion}}'],text=True).strip()
class Docker(http.client.HTTPConnection):
    def __init__(self): super().__init__('localhost', timeout=90)
    def connect(self):
        self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
        self.sock.connect('/var/run/docker.sock')
def request(method,path,data=None):
    client=Docker(); encoded=None if data is None else json.dumps(data)
    client.request(method,'/v'+API_VERSION+path,encoded,{'Content-Type':'application/json'})
    response=client.getresponse(); body=response.read(); client.close()
    if response.status>=400: raise RuntimeError(f'Docker operation failed: HTTP {response.status}')
    return json.loads(body) if body else None
names=subprocess.check_output(['docker','ps','--format','{{.Names}}'],text=True).splitlines()
names=[name for name in names if name.startswith('supabase_') and name.endswith('_fitspace')]
local=','.join(['localhost','127.0.0.1','::1','0.0.0.0',*names])
for name in names:
    if name not in ['supabase_auth_fitspace','supabase_storage_fitspace']: continue
    original=request('GET','/containers/'+name+'/json'); config=original['Config']
    env=config.get('Env',[])
    if not any(item.split('=',1)[0].lower() in ['http_proxy','https_proxy'] for item in env): continue
    if all('0.0.0.0' in item for item in env if item.startswith(('NO_PROXY=','no_proxy='))):
        if any(name in item for item in env if item.startswith('NO_PROXY=')) and 'env -u http_proxy' in str(config.get('Healthcheck')): continue
    config['Env']=[item for item in env if item.split('=',1)[0].lower()!='no_proxy']
    previous=','.join(item.split('=',1)[1] for item in env if item.split('=',1)[0].lower()=='no_proxy')
    config['Env'] += ['NO_PROXY='+previous+','+local,'no_proxy='+previous+','+local]
    health=config.get('Healthcheck',{})
    test=health.get('Test',[])
    if len(test)==2 and test[0]=='CMD-SHELL' and 'http://127.0.0.1:' in test[1]:
        health['Test']=['CMD-SHELL','env -u http_proxy -u HTTP_PROXY -u https_proxy -u HTTPS_PROXY '+test[1]]
    if name=='supabase_auth_fitspace':
        values=dict(item.split('=',1) for item in config['Env'])
        if not values.get('GOTRUE_MAILER_TEMPLATES_CONFIRMATION') and values.get('GOTRUE_MAILER_TEMPLATES_MAGIC_LINK'):
            config['Env'].append('GOTRUE_MAILER_TEMPLATES_CONFIRMATION='+values['GOTRUE_MAILER_TEMPLATES_MAGIC_LINK'])
    config['Hostname']=''
    networks={network:{'Aliases':[alias for alias in details.get('Aliases',[]) if alias and alias!=original['Id'][:12]]} for network,details in original['NetworkSettings']['Networks'].items()}
    request('POST','/containers/'+name+'/stop?t=10')
    request('DELETE','/containers/'+name)
    created=request('POST','/containers/create?name='+name,{**config,'HostConfig':original['HostConfig'],'NetworkingConfig':{'EndpointsConfig':networks}})
    request('POST','/containers/'+created['Id']+'/start')
    print('Configured local-only proxy exceptions:',name)
