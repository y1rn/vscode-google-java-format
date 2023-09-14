
import * as vscode from "vscode";
import { platform, tmpdir } from 'os'
import * as glob from "fast-glob";
import { delimiter, sep } from 'path'
import * as cp from "child_process";
import * as rpc from 'vscode-jsonrpc/node';


const LOCAL_EXEC_FILE = "google-java-format-service";

const LOCAL_JAR_FILE = "google-java-format-service.jar";
const JAVA_GLOB = `${sep}jre${sep}*${sep}bin${sep}java${(platform() == 'win32' ? ".exe" : "")}`;
const JAVA_EXPORT = ['--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED',
                    '--add-exports=jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED',
                    '--add-exports=jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED',
                    '--add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED',
                    '--add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED'];


export async function StartRPC(context: vscode.ExtensionContext): Promise<rpc.MessageConnection> {

  // const googleJarPath = context.globalState.get("google-java-format.jar-file");
  // if (!googleJarPath) {
  //   return Promise.reject();
  // }
  // const localJarPath = context.extensionPath + sep + "dist" + sep + LOCAL_JAR_FILE;
  // let cmd = "java";
  // let redhatPath = vscode.extensions.getExtension("redhat.java")?.extensionPath;
  // if (redhatPath) {
  //   const pattern = platform() == 'win32' ? glob.convertPathToPattern(redhatPath + JAVA_GLOB) : redhatPath + JAVA_GLOB
  //   const files = await glob([pattern], { dot: true });
  //   if (files && files.length > 0) {
  //     cmd = files[0];
  //   }
  // }

  // const jarPath = `${localJarPath}${delimiter}${googleJarPath}`;

  // let childProcess = cp.spawn(cmd, [
  //       '-Xlog:jni+resolve=off',
  //       '-cp', 
  //       jarPath,
  //       ...JAVA_EXPORT,
  //       'y1rn.javaformat.RPC',
  //     ], {
  //       // shell: true,
  //       cwd: context.extensionPath,
  //     });



  const localJarPath = context.extensionPath + sep + "dist" + sep + LOCAL_JAR_FILE;
  let cmd = "java";
  let redhatPath = vscode.extensions.getExtension("redhat.java")?.extensionPath;
  if (redhatPath) {
    const pattern = platform() == 'win32' ? glob.convertPathToPattern(redhatPath + JAVA_GLOB) : redhatPath + JAVA_GLOB
    const files = await glob([pattern], { dot: true });
    if (files && files.length > 0) {
      cmd = files[0];
    }
  }
  let childProcess = cp.spawn(cmd, [
        '-Xlog:disable',
        ...JAVA_EXPORT,
        '-jar', 
        localJarPath,
      ], {
        // shell: true,
        cwd: context.extensionPath,
      });

  // let childProcess = cp.spawn(context.extensionPath + sep + "dist" + sep + LOCAL_EXEC_FILE, [], {
  //       // shell: true,
  //       cwd: context.extensionPath,
  //     });
  console.info(`rpc service start with pid: ${childProcess.pid}`);

  let connection = rpc.createMessageConnection(
	new rpc.StreamMessageReader(childProcess.stdout),
	new rpc.StreamMessageWriter(childProcess.stdin));
  // let connection = rpc.createMessageConnection(childProcess.stdout, childProcess.stdin, console);
  childProcess.stderr.on('data', data => {
    console.error(data.toString());
  })
  connection.onClose(() => {
    console.info("connection close");
  })
  connection.onError(err => {
    console.error(err);
  });
  connection.listen();
  return Promise.resolve(connection);

}

export function shutdownRPC(){

}