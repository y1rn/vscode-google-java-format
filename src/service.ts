import * as vscode from 'vscode';
import { platform, arch } from 'os'
import * as glob from 'fast-glob';
import { sep } from 'path'
import * as cp from 'child_process';
import * as rpc from 'vscode-jsonrpc/node';
import * as fs from 'fs';
import * as download from './downloader';
import {HttpsProxyAgent} from 'https-proxy-agent';


const VERSION_KEY = 'java-format-service-version';

const LOCAL_JAR_FILE = 'java-format-service.jar';
const JAVA_GLOB = `${sep}jre${sep}*${sep}bin${sep}java${(platform() == 'win32' ? '.exe' : '')}`;
const JAVA_EXPORT = ['--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED',
  '--add-exports=jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED',
  '--add-exports=jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED',
  '--add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED',
  '--add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED'];

const archSet:Set<string> = new Set([
  // 'win32-amd64',
  'linux-amd64',
]);



export async function StartRPC(context: vscode.ExtensionContext): Promise<rpc.MessageConnection> {

  let exe_file = '';
  try {
    exe_file = await getExec(context);
  } catch (error) {}

  return new Promise<rpc.MessageConnection>((resolve) => {
    fs.access(exe_file, fs.constants.X_OK, err => {
      let childProcess: cp.ChildProcessWithoutNullStreams;
      if (!err) {
        childProcess = cp.spawn(exe_file, [], {
          cwd: context.extensionPath,
        });
        resolve(connect(childProcess));

      } else {
        const localJarPath = context.extensionPath + sep + 'dist' + sep + LOCAL_JAR_FILE;
        let cmd = 'java';
        let redhatPath = vscode.extensions.getExtension('redhat.java')?.extensionPath;
        if (redhatPath) {
          const pattern = platform() == 'win32' ? glob.convertPathToPattern(redhatPath + JAVA_GLOB) : redhatPath + JAVA_GLOB
          const p = glob([pattern], { dot: true }).then(files =>{
            if (files && files.length > 0) {
              cmd = files[0];
            }
          });
          p.finally(() => {
            childProcess = cp.spawn(cmd, [
              '-Xlog:disable',
              ...JAVA_EXPORT,
              '-jar',
              localJarPath,
            ], {
              // shell: true,
              cwd: context.extensionPath,
            });
            resolve(connect(childProcess));
          })
        }
      }
    })

  });

}

 function connect(childProcess: cp.ChildProcessWithoutNullStreams): rpc.MessageConnection {
    console.info(`rpc service start with pid: ${childProcess.pid}`);

    let connection = rpc.createMessageConnection(
      new rpc.StreamMessageReader(childProcess.stdout),
      new rpc.StreamMessageWriter(childProcess.stdin));
    // let connection = rpc.createMessageConnection(childProcess.stdout, childProcess.stdin, console);
    connection.onClose(() => {
      console.info('connection close');
    });
    connection.onError(err => {
      console.error(err);
    });
    connection.listen();
  return connection;
}


async function getExec(context:vscode.ExtensionContext): Promise<string> {
  let sa = systemArch();
  if (archSet.has(sa)){
    sa = platform() == 'win32' ? sa + '.exe': sa;
    let agent: HttpsProxyAgent | undefined;
    const httpCfg = vscode.workspace.getConfiguration("http", null);
    if (httpCfg.proxy) {
      agent = new HttpsProxyAgent(httpCfg.proxy);
    }
    let version = context.globalState.get<string>(VERSION_KEY);

    let filePath = `${context.extensionPath}${sep}dist${sep}java-format-service_${sa}`;
    if (fs.existsSync(filePath)) {
      return Promise.resolve(filePath)
    }
    download(context.extensionPath + sep + 'dist','y1rn/java-format-service','java-format-service_'+sa, null , agent).then(res => {
      console.warn("java-format-service downloaded");
      fs.chmodSync(res.path, '0550')
      if(version != res.version){
        context.globalState.update(VERSION_KEY,res.version);
      }
    });
  }
  return Promise.reject();
}

function systemArch(): string {
  const p = platform();
  let a = arch();
  if (a == 'x64') a = 'amd64';
  return p + '-' + a
}
