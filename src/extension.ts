// The module 'vscode' contains the VS Code extensibility API
import * as fs from "fs";
import * as vscode from "vscode";
import * as rpc from 'vscode-jsonrpc/node';
import { DownloadGJF } from './downloader';
import { StartRPC } from './service';
import { JsonToTextEdit } from './utils';

interface formatRange{
  start: number,
  end: number,

}
interface formatRequestData {
  skipSortingImports: boolean,
  skipRemovingUnusedImports: boolean,
  style: string,
  data: string,
  range: formatRange,
}

const FORMAT_REQUEST = new rpc.RequestType<formatRequestData, vscode.TextEdit[], void>("format");

var FORMATER_NAME: string;
var SP: Promise<rpc.MessageConnection> | null;


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  FORMATER_NAME = (context as any)['extension'].id;
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('[java]')) {
      const javaCfg = vscode.workspace.getConfiguration("[java]", null);
      if (!!javaCfg && javaCfg['editor.defaultFormatter'] == FORMATER_NAME) {
        if (!SP) {
          SP = startUp(context)
        }
      } else {
        deactivate();
      }
    }
  })
  const javaCfg = vscode.workspace.getConfiguration("[java]", null);
  if (!!javaCfg && javaCfg['editor.defaultFormatter'] == FORMATER_NAME) {
    SP = startUp(context);
  }

  let rangeFormatDispose = vscode.languages.registerDocumentRangeFormattingEditProvider(
    { scheme:'file', language: 'java' },
    {
      provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
      ): Promise<vscode.TextEdit[]> {
        if (!!SP) {
          return new Promise((resolve, reject) => {
            SP?.then((connection) => {
              resolve( doFormatCode(connection, document, range))
            });
            SP?.catch(() => {
              SP = startUp(context)
              reject();
            });
          });
        } else {
          // vscode.window.showErrorMessage("java format service not avaliable")
          return Promise.reject();
        }
      },
    },
  );

  let formatDispose = vscode.languages.registerDocumentFormattingEditProvider(
    { scheme: 'file', language: 'java' },
    {
      async provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
      ): Promise<vscode.TextEdit[]> {
        if (!!SP) {
          return new Promise((resolve, reject) => {
            SP?.then((connection) => {
              resolve( doFormatCode(connection, document))
            });
            SP?.catch(() => {
              SP = startUp(context)
              reject();
            });
          });
        } else {
          // vscode.window.showErrorMessage("java format service not avaliable")
          return Promise.reject();
        }
      }
    }
  );


  context.subscriptions.push(rangeFormatDispose);
  context.subscriptions.push(formatDispose);
  
}

async function startUp(context: vscode.ExtensionContext): Promise<rpc.MessageConnection> {


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
      }, (progress) => {
        let p = DownloadGJF(context, progress);

        p.then(async () => {
          const connection = await StartRPC(context);
          resolve(connection);
          return {
            message:'download finish',
            increment: 100,
          }
        });
        
        p.catch((err) => {
          console.error(err);
          reject();
          return Promise.reject()
        })
        return p;
      }
      );
    });
  } else {
    return StartRPC(context);
  }
}

// this method is called when your extension is deactivated
export function deactivate() {
  // shutdown();
  if (!!SP) {
    SP.then((connection) => {
      connection.end();
      SP = null;
    });
    SP.catch(() => {
      SP = null;
    });
  }else {
    SP = null;
  }
 
}

async function doFormatCode(connection: rpc.MessageConnection, document: vscode.TextDocument, range?: vscode.Range): Promise<vscode.TextEdit[]> {
  const cfg = vscode.workspace.getConfiguration("google-java-format", null);
  let r: formatRange | undefined = undefined;
  if (!!range) {
    r = <formatRange> {
      start: range.start.line,
      end: range.end.line,
    }
  }
  const data = <formatRequestData>{
    skipSortingImports: cfg.get("skipSortingImports"),
    skipRemovingUnusedImports: cfg.get("skipRemovingUnusedImports"),
    style: cfg.get("style"),
    data: document.getText(),
    range: r,
  }
  return connection.sendRequest(FORMAT_REQUEST, data).then(data => {
    const res: vscode.TextEdit[] = [];
    if (data instanceof Array) {
      data.forEach((item: vscode.TextEdit) => {
        res.push(JsonToTextEdit(item));
      });
      return res;
    } else {
      throw new Error(`incorrect response: ${data}`);
    }
  });

  // const promise = connection.sendRequest(FORMAT_REQUEST, data).then(resp=>{
  //   console.info(resp);
  //   return [] as vscode.TextEdit[]; 
  // }).catch(err=>{
  //   console.error(err);
  //   return [] as vscode.TextEdit[]; 
  // });
  // return promise;
}
