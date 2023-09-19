package y1rn.javaformat;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import lombok.extern.java.Log;
import org.eclipse.lsp4j.jsonrpc.StandardLauncher;
import org.eclipse.lsp4j.jsonrpc.json.JsonRpcMethod;
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler;
import org.eclipse.lsp4j.jsonrpc.json.StreamMessageProducer;
import org.eclipse.lsp4j.jsonrpc.messages.Message;
import org.eclipse.lsp4j.jsonrpc.messages.MessageIssue;
import org.eclipse.lsp4j.jsonrpc.messages.RequestMessage;
import org.eclipse.lsp4j.jsonrpc.messages.ResponseMessage;

@Log
public class RPC {

  public static void main(String[] args) {
    LogConfig.init();
    ExecutorService es = Executors.newCachedThreadPool();
    Map<String, JsonRpcMethod> mm =
        Map.of(
            FormatHandler.METHOD_FORMAT,
                JsonRpcMethod.request(FormatHandler.METHOD_FORMAT, List.class, Request.class),
            FormatHandler.METHOD_EXIT, JsonRpcMethod.notification(FormatHandler.METHOD_EXIT));
    MessageJsonHandler mjh = new MessageJsonHandler(mm);

    FormatHandler fh = new FormatHandler(System.out, mjh);

    StreamMessageProducer smp =
        new StreamMessageProducer(
            System.in,
            mjh,
            (Message message, List<MessageIssue> issues) -> {
              if (!issues.isEmpty()) {
                MessageIssue issue = issues.get(0);
                ResponseMessage resp = new ResponseMessage();
                resp.setId(Integer.parseInt(((RequestMessage) message).getId()));
                resp.setResult(
                    issue.getCause().getMessage()
                        + "["
                        + issue.getCause().getStackTrace()[0].toString()
                        + "]");
                fh.writeResponse(resp);
              }

              log.severe(message.toString());
              issues.forEach(
                  issue -> {
                    log.severe(issue.getCause().getMessage());
                    for (StackTraceElement traceElement : issue.getCause().getStackTrace()) {
                      log.severe(traceElement.toString());
                    }
                  });
            });
    StandardLauncher<Void> launcher = new StandardLauncher<>(smp, fh, es, null, null);
    launcher.startListening();
  }
}

