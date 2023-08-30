// The module 'vscode' contains the VS Code extensibility API
import * as vscode from "vscode";
import fetch from "node-fetch";
import * as fs from "fs";
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as net from "net";
import * as cp from "child_process";
import { delimiter, sep } from 'path'
import { platform } from 'os'
import * as glob from "fast-glob";
import * as http from "http";

const GOOGLE_JAVA_FORMAT_INFO_URL = "https://api.github.com/repos/google/google-java-format/releases/latest";
const LOCAL_JAR_FILE = "google-java-format-service.jar";
const NAME = 'y1rn.google-java-format';
const JAVA_GLOB = `${sep}jre${sep}*${sep}bin${sep}java${(platform() == 'win32' ? ".exe" : "")}`;
const SOCK_FILE_NAME = "gjfs.sock";
const JAVA_EXPORT = ['--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED',
                    '--add-exports=jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED',
                    '--add-exports=jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED',
                    '--add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED',
                    '--add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED'];

var PROCESS: cp.ChildProcessWithoutNullStreams | null;
var PORT: number;
var SOCKET_PATH:string | null;
var SERVER_ADDR: string | null;


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  vscode.workspace.onDidChangeConfiguration(e => {
    const javaCfg = vscode.workspace.getConfiguration("[java]");
    if (!!javaCfg && javaCfg['editor.defaultFormatter'] == NAME) {
      startUp(context);
    } else {
      deactivate();
    }
  })
  const javaCfg = vscode.workspace.getConfiguration("[java]");
  if (!!javaCfg && javaCfg['editor.defaultFormatter'] == NAME) {
    startUp(context);
  }
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.languages.registerDocumentRangeFormattingEditProvider(
    { scheme: "file", language: "java" },
    {
      provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
      ): Promise<vscode.TextEdit[]> {
        if (range.isEmpty) {
          return Promise.resolve([]);
        }
        return getResp(document, range);
      },
    }
  );
  context.subscriptions.push(disposable);
}

function startUp(context: vscode.ExtensionContext) {


  if (!fs.existsSync(context.globalStorageUri.fsPath)) {
    fs.mkdir(context.globalStorageUri.fsPath, (error: any) => error ? console.log(error) : console.log('You have created extension folder: ' + context.globalStorageUri.fsPath));
  }
  const filePath = context.globalState.get<string>("gjfs.jar-file");
  if (!filePath || filePath == "" || !fs.existsSync(filePath.toString())) {
    downloadJar(context).then(() => {
      starService(context);
    }).catch((a) => { })
  } else {
    starService(context);
  }
}

// this method is called when your extension is deactivated
export function deactivate() {
  if (PROCESS != null && !PROCESS.killed) {
    if (platform() == 'win32') {
      cp.exec('taskkill /F /pid ' + PROCESS.pid);
    }else{
      PROCESS.kill('SIGKILL');
    }
    console.log(`kill process  : ${PROCESS.pid}`);
    PROCESS = null;
    if (!!SOCKET_PATH && fs.existsSync(SOCKET_PATH)) {
      // fs.unlinkSync(SOCKET_PATH);
    }
  }
}

async function getResp(
  document: vscode.TextDocument,
  range: vscode.Range
): Promise<vscode.TextEdit[]> {
  if (!PROCESS || !PROCESS.pid || PROCESS.killed ) {
    return Promise.reject([])
  }
  const cfg = vscode.workspace.getConfiguration("gjfs");
 
  if (!!SERVER_ADDR) {
    if (!!SOCKET_PATH) {
      return new Promise((resolve, reject) =>{
        const callback = (res: http.IncomingMessage) => {
          res.setEncoding('utf8');
          if (res.statusCode == 200) {
            res.on('data', data => {
              console.log(data);
              resolve([vscode.TextEdit.replace(range, data)]);
            });
          }else{
            res.on('error', data => {
              console.error(data)
              reject([]);              
            });
          }
        };
        try {
          const clientRequest = http.request({
            socketPath: SOCKET_PATH || "",
            path: '/files',
            headers: { "Content-Type": "application/json" },
            method: "POST",
          }, callback);
          clientRequest.write(JSON.stringify({
            skipSortingImports: cfg.get("skipSortingImports"),
            skipRemovingUnusedImports: cfg.get("skipRemovingUnusedImports"),
            styleName: cfg.get("style"),
            data: document.getText(range),
          }));
          clientRequest.end();
        } catch (error) {
          console.error(error);
          reject([]);
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

      const data = await response.text();

      if (!response.ok || !data) {
        vscode.window.showErrorMessage(data);
        return Promise.reject([]);
      }
      return Promise.resolve([vscode.TextEdit.replace(range, data)]);
    }
  
  }
  return Promise.reject([]);


}

async function starService(context: vscode.ExtensionContext) {

  if (PROCESS && !PROCESS.killed) {
    return;
  }
  const googleJarPath = context.globalState.get("gjfs.jar-file");
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

  //try to startup with unix socket
  if (platform() != 'win32') {
    try {
      const socketPath = context.globalStorageUri.fsPath + sep + SOCK_FILE_NAME;
      try {
        fs.unlinkSync(socketPath);
      } catch (error) { }
      PROCESS = cp.spawn(cmd, ['-cp', `\"${localJarPath}${delimiter}${googleJarPath}\"`,
        ...JAVA_EXPORT,
        'cn.gjfs.App',
        `-s=${socketPath}`
      ], {
        shell: true,
        cwd: context.extensionPath,
      });
      SOCKET_PATH = socketPath;
      SERVER_ADDR = 'http://localhost'
      console.log("service start up with socket path: " + socketPath);
      if (!!PROCESS) {
        PROCESS.stdout.on('data', (data) => {
          console.log(`google java format: ${data}`);
        });
        PROCESS.stderr.on('data', (data) => {
          console.log(`google java format: ${data}`);
        });
      }
      return;
    } catch (err) {
      console.log(err);
    }
  }
 

  try {
    const port = await getPortFree();
    PROCESS = cp.spawn(cmd, ['-cp', `\"${localJarPath}${delimiter}${googleJarPath}\"`,
      ...JAVA_EXPORT,
      'cn.gjfs.App',
      `-p=${port}`
    ], {
      shell: true,
      cwd: context.extensionPath,
    });
   
    console.log("service start up on port: " + port);
    SERVER_ADDR = `http://localhost:${port}/files`

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

async function downloadJar(context: vscode.ExtensionContext): Promise<void> {
  const httpCfg = vscode.workspace.getConfiguration("http");
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
        filePath = context.globalStorageUri.fsPath + sep + asset.name;
        break;
      }
    }
  } catch (error) {
    vscode.window.showErrorMessage("fail to get google-java-format info");
  }


  if (!filePath) return Promise.reject();

  if (fs.existsSync(filePath.toString())) {
    context.globalState.update("gjfs.jar-file", filePath);
    return Promise.resolve();
  }

  if (downloadUrl) {
    try {
      const response = await fetch(downloadUrl, { agent: agent });

      if (!response.ok) {
        const data = await response.text();
        console.error(data)
        vscode.window.showErrorMessage(data);
        return Promise.reject();
      }
      const buffer = await response.buffer();
      await fs.promises.writeFile(filePath.toString(), buffer);
      context.globalState.update("gjfs.jar-file", filePath);
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
