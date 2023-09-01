// The module 'vscode' contains the VS Code extensibility API
import * as vscode from "vscode";
import fetch from "node-fetch";
import * as fs from "fs";
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as net from "net";
import * as cp from "child_process";
import { delimiter, sep } from 'path'
import { platform, tmpdir } from 'os'
import * as glob from "fast-glob";
import * as http from "http";
import * as shortid from "shortid";
import { parseJsonText } from "typescript";
import { error } from "console";

const GOOGLE_JAVA_FORMAT_INFO_URL = "https://api.github.com/repos/google/google-java-format/releases/latest";
const LOCAL_JAR_FILE = "google-java-format-service.jar";
const JAVA_GLOB = `${sep}jre${sep}*${sep}bin${sep}java${(platform() == 'win32' ? ".exe" : "")}`;
const JAVA_EXPORT = ['--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED',
                    '--add-exports=jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED',
                    '--add-exports=jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED',
                    '--add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED',
                    '--add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED'];

var PROCESS: cp.ChildProcessWithoutNullStreams | null;
var SOCKET_PATH:string | null;
var SERVER_ADDR: string | null;
var FORMATER_NAME: string;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  FORMATER_NAME = (context as any)['extension'].id;
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('[java]')) {
      const javaCfg = vscode.workspace.getConfiguration("[java]",null);
      if (!!javaCfg && javaCfg['editor.defaultFormatter'] == FORMATER_NAME) {
        startUp(context).catch();
      } else {
        deactivate();
      }
    }

  })
  const javaCfg = vscode.workspace.getConfiguration("[java]", null);
  if (!!javaCfg && javaCfg['editor.defaultFormatter'] == FORMATER_NAME) {
    startUp(context).catch();
  }
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  // let rangeFormatDispose = vscode.languages.registerDocumentRangeFormattingEditProvider(
  //   { scheme:'file', language: 'java' },
  //   {
  //     provideDocumentRangeFormattingEdits(
  //       document: vscode.TextDocument,
  //       range: vscode.Range,
  //       options: vscode.FormattingOptions,
  //       token: vscode.CancellationToken
  //     ): Promise<vscode.TextEdit[]> {
  //       console.log(`run by registerDocumentRangeFormattingEditProvider`);

  //       if (range.isEmpty) {
  //         return Promise.resolve([]);
  //       }
  //       return getFormatCode(document, range);
  //     },
  //   },
  // );

  let formatDispose = vscode.languages.registerDocumentFormattingEditProvider(
    { scheme: 'file', language: 'java' },
    {
       async provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
        ): Promise<vscode.TextEdit[]> {
        return getFormatCode(document, undefined);
      }
    }
  );
  // context.subscriptions.push(rangeFormatDispose);
  context.subscriptions.push(formatDispose);
}

async function startUp(context: vscode.ExtensionContext): Promise<void> {


  if (!fs.existsSync(context.globalStorageUri.fsPath)) {
    fs.mkdir(context.globalStorageUri.fsPath, (error: any) => error ? console.log(error) : console.log('You have created extension folder: ' + context.globalStorageUri.fsPath));
  }
  const filePath = context.globalState.get<string>("google-java-format.jar-file");
  if (!filePath || filePath == "" || !fs.existsSync(filePath.toString())) {
    return new Promise((resolve, reject) => {
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "google-java-format",
        cancellable: false
      }, (progress) => downloadJar(context, progress)
        .catch(() => reject())
        .then(() => starService(context)
          .then(() => resolve())
          .catch(() => reject())));
    });
  } else {
    return starService(context);
  }
}

// this method is called when your extension is deactivated
export function deactivate() {
  if (PROCESS != null && !PROCESS.killed) {
    if (platform() == 'win32') {
      // PROCESS.kill();
      cp.exec(`taskkill /pid ${PROCESS.pid} /T /F`);
    }else{
      PROCESS.kill('SIGTERM');
    }
    console.log(`kill process  : ${PROCESS.pid}`);
    PROCESS = null;
  }
}

async function getFormatCode(
  document: vscode.TextDocument,
  range: vscode.Range | undefined
): Promise<vscode.TextEdit[]> {
  if (!PROCESS || !PROCESS.pid || PROCESS.killed ) {
    return Promise.reject([])
  }
  const cfg = vscode.workspace.getConfiguration("google-java-format", null);
 
  if (!!SERVER_ADDR) {
    if (!!SOCKET_PATH) {
      return new Promise((resolve, reject) =>{
        const callback = (res: http.IncomingMessage) => {
          res.setEncoding('utf8');
          res.on('error', data => {
            console.log(data);
            reject([]);
          });
          if (res.statusCode == 200) {
            res.on('data', data => {
              const res: vscode.TextEdit[] = [];
              const arr = JSON.parse(data)
              if (arr instanceof Array) {
                arr.forEach((item: vscode.TextEdit) => {
                  res.push(jsonToTextEdit(item));
                });
                resolve(res);
              }else {
                throw new Error(`incorrect response: ${data}`);
              }
            });
          }else{
            reject([]);
          }
        };
       
        if (!!SOCKET_PATH) {
          try {
            const clientRequest = http.request({
              socketPath: SOCKET_PATH || "",
              path: '/format',
              headers: { "Content-Type": "application/json" },
              method: "POST",
            }, callback);
            clientRequest.write(JSON.stringify({
              skipSortingImports: cfg.get("skipSortingImports"),
              skipRemovingUnusedImports: cfg.get("skipRemovingUnusedImports"),
              styleName: cfg.get("style"),
              data: document.getText(range),
            }));
            clientRequest.on("error", (error) => {
              console.error(error);
              reject([]);
            });
            clientRequest.end();
          } catch (error) {
            console.error(error);
            reject([]);
          }
        }

      });
    } else {
      var response = await fetch(SERVER_ADDR, {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skipSortingImports: cfg.get("skipSortingImports"),
          skipRemovingUnusedImports: cfg.get("skipRemovingUnusedImports"),
          styleName: cfg.get("style"),
          data: document.getText(range),
        }),
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.text();
        vscode.window.showErrorMessage(data);
        return Promise.reject([]);
      }

      return response.json().then(data => {
        const res:vscode.TextEdit[] = [];
        if (data instanceof Array) {
          data.forEach((item: vscode.TextEdit) => {
            res.push(jsonToTextEdit(item));
          });
          return res;
        }else{
          throw new Error(`incorrect response: ${data}`);
        }
      })
    }
  
  }
  return Promise.reject([]);
}

async function starService(context: vscode.ExtensionContext) {

  if (PROCESS && !PROCESS.killed) {
    return;
  }
  const googleJarPath = context.globalState.get("google-java-format.jar-file");
  if (!googleJarPath) {
    return;
  }
  const localJarPath = context.extensionPath + sep + "dist" + sep + LOCAL_JAR_FILE;

  var cmd = "java";
  var redhatPath = vscode.extensions.getExtension("redhat.java")?.extensionPath;
  if (redhatPath) {
    const pattern = platform() == 'win32' ? glob.convertPathToPattern(redhatPath + JAVA_GLOB) : redhatPath + JAVA_GLOB
    const files = await glob([pattern], { dot: true });
    if (files && files.length > 0) {
      cmd = files[0];
    }
  }

  const jarPath = `${localJarPath}${delimiter}${googleJarPath}`;
  
  // //try to startup with unix socket
  // if (platform() != 'win32') {
  //   try {
  //     const socketPath = tmpdir()+ sep+ shortid.generate() + ".sock";

  //     PROCESS = cp.spawn(cmd, ['-cp', jarPath,
  //       ...JAVA_EXPORT,
  //       'y1rn.javaformat.App',
  //       `-s=${socketPath}`
  //     ], {
  //       shell: false,
  //       cwd: context.globalStorageUri.fsPath,
  //     });
  //     console.log("service start up with socket path: " + socketPath);
  //     if (!!PROCESS) {
  //       PROCESS.stdout.on('data', (data) => {
  //         console.log(`google java format: ${data}`);
  //       });
  //       PROCESS.stderr.on('data', (data) => {
  //         console.log(`google java format: ${data}`);
  //       });
  //     }
      
  //     SOCKET_PATH = socketPath;
  //     SERVER_ADDR = 'http://localhost'
  //     return;
  //   } catch (err) {
  //     console.log(err);
  //   }
  // }
 
  starServiceWithPort(cmd, jarPath,context);


}

async function starServiceWithPort(cmd:string, jarPath:string, context: vscode.ExtensionContext){
  try {
    const port = await getPortFree();
    PROCESS = cp.spawn(cmd, ['-cp', jarPath,
      ...JAVA_EXPORT,
      'y1rn.javaformat.App',
      `-p=${port}`
    ], {
      shell: true,
      cwd: context.extensionPath,
    });

    console.log("service start up on port: " + port);
    SERVER_ADDR = `http://localhost:${port}/format`

    if (!!PROCESS) {
      PROCESS.stdout.on('data', (data) => {
        console.log(`google java format: ${data}`);
      });
      PROCESS.stderr.on('data', (data) => {
        console.log(`google java format: ${data}`);
      });
    }
  } catch (err) {
    console.log(err);
  }
}


async function downloadJar(context: vscode.ExtensionContext, progress: vscode.Progress<any>): Promise<void> {
  const httpCfg = vscode.workspace.getConfiguration("http", null);
  var agent
  if (httpCfg.proxy) {
    agent = new HttpsProxyAgent(httpCfg.proxy);
  }
  var downloadUrl;
  var filePath;
  try {
    const response = await fetch(GOOGLE_JAVA_FORMAT_INFO_URL, {
      headers: { "Content-Type": "application/json" },
      method: "GET",
      agent: agent,
    });
    if (!response.ok) {
      const data = await response.text();
      vscode.window.showErrorMessage(data);
      return Promise.reject();
    }
    const data = await response.json();

    for (const asset of data.assets) {
      if (asset.name.match("^google-java-format-[0-9]+\.[0-9]+\.[0-9]+-all-deps.jar$")) {
        downloadUrl = asset.browser_download_url;
        progress.report({ message: `found ${asset.name}` });
        filePath = context.globalStorageUri.fsPath + sep + asset.name;
        break;
      }
    }
  } catch (error) {
    vscode.window.showErrorMessage("fail to get google-java-format github info");
    return Promise.reject();
  }


  if (!filePath) return Promise.reject();

  if (fs.existsSync(filePath.toString())) {
    context.globalState.update("google-java-format.jar-file", filePath);
    return Promise.resolve();
  }

  if (downloadUrl) {
    try {
      setTimeout(() => {
        progress.report({ message: "downloading" });
      }, 1000);

      const response = await fetch(downloadUrl, { agent: agent, timeout: 20000});

      if (!response.ok) {
        const data = await response.text();
        console.error(data)
        vscode.window.showErrorMessage(data);
        return Promise.reject();
      }
      const buffer = await response.buffer();
      await fs.promises.writeFile(filePath.toString(), buffer);
      context.globalState.update("google-java-format.jar-file", filePath);
      return Promise.resolve()
    } catch (error) {
      vscode.window.showErrorMessage("fail to download google-java-format jar file");
    }
  }

  return Promise.reject()
}


async function getPortFree(): Promise<number> {
  return new Promise<number>(res => {
    const srv = net.createServer();
    if (srv != null) {
      srv.listen(0, () => {
        const addrInfo = srv.address()
        if (addrInfo) {
          const port = (addrInfo as net.AddressInfo).port;
          srv.close((err) => res(port))
        }
      });
    }
  })
}

function jsonToTextEdit(data: vscode.TextEdit): vscode.TextEdit{
  const start: vscode.Position = new vscode.Position(data.range.start.line, data.range.start.character);
  const end: vscode.Position = new vscode.Position(data.range.end.line, data.range.end.character);
  const range: vscode.Range = new vscode.Range(start, end);
  const te: vscode.TextEdit = new vscode.TextEdit(range, data.newText);
  return te;
}