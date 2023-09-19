
import * as vscode from "vscode";
import { platform } from 'os'
import * as glob from "fast-glob";
import { sep } from 'path'
import * as cp from "child_process";
import * as rpc from 'vscode-jsonrpc/node';
import * as fs from "fs";


const LOCAL_EXE_FILE = "java-format-service";

const LOCAL_JAR_FILE = "java-format-service.jar";
const JAVA_GLOB = `${sep}jre${sep}*${sep}bin${sep}java${(platform() == 'win32' ? ".exe" : "")}`;
const JAVA_EXPORT = ['--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED',
  '--add-exports=jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED',
  '--add-exports=jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED',
  '--add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED',
  '--add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED'];


export async function StartRPC(context: vscode.ExtensionContext): Promise<rpc.MessageConnection> {

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

  const exe_file = context.extensionPath + sep + "dist" + sep + LOCAL_EXE_FILE


  return new Promise<rpc.MessageConnection>((resolve, reject) => {
    fs.access(exe_file, fs.constants.X_OK, err => {
      let childProcess: cp.ChildProcessWithoutNullStreams;
      if (!err) {
        childProcess = cp.spawn(exe_file, [], {
          cwd: context.extensionPath,
        });
      } else {
        childProcess = cp.spawn(cmd, [
          '-Xlog:disable',
          ...JAVA_EXPORT,
          '-jar',
          localJarPath,
        ], {
          // shell: true,
          cwd: context.extensionPath,
        });
      }

      console.info(`rpc service start with pid: ${childProcess.pid}`);

      let connection = rpc.createMessageConnection(
        new rpc.StreamMessageReader(childProcess.stdout),
        new rpc.StreamMessageWriter(childProcess.stdin));
      // let connection = rpc.createMessageConnection(childProcess.stdout, childProcess.stdin, console);
      // childProcess.stderr.on('data', data => {
      //   console.error(data.toString());
      // });
      connection.onClose(() => {
        console.info("connection close");
      });
      connection.onError(err => {
        console.error(err);
      });
      connection.listen();
      resolve(connection)
    })

  });

}
