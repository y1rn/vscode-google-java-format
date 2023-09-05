package y1rn.javaformat;

import com.google.common.base.Strings;
import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.logging.Level;
import java.util.logging.LogManager;
import lombok.extern.java.Log;
import org.eclipse.lsp4j.jsonrpc.StandardLauncher;
import org.eclipse.lsp4j.jsonrpc.json.JsonRpcMethod;
import org.eclipse.lsp4j.jsonrpc.json.MessageJsonHandler;
import org.eclipse.lsp4j.jsonrpc.json.StreamMessageProducer;
import org.eclipse.lsp4j.jsonrpc.messages.Message;
import org.eclipse.lsp4j.jsonrpc.messages.MessageIssue;

@Log
public class RPC {

  public static void main(String[] args) throws IOException {
    initLog();
    ExecutorService es = Executors.newCachedThreadPool();
    Map<String, JsonRpcMethod> mm =
        Map.of("format", JsonRpcMethod.request("format", List.class, Request.class));

    MessageJsonHandler mjh = new MessageJsonHandler(mm);
    StreamMessageProducer smp =
        new StreamMessageProducer(
            System.in,
            mjh,
            (Message message, List<MessageIssue> issues) -> {
              log.severe(message.toString());
              issues.forEach(
                  issue -> {
                    log.severe(issue.getCause().getMessage());
                  });
            });
    FormatHandler fh = new FormatHandler(System.out, mjh);
    StandardLauncher<Void> launcher = new StandardLauncher<Void>(smp, fh, es, null, null);
    launcher.startListening();
  }

  public static void initLog() {
    // System.setProperty("java.util.logging.SimpleFormatter.format", "%1$tF
    // %1$tT.%1$tL %4$s [y1rn.java-format]: %5$s%n");
    System.setProperty("java.util.logging.SimpleFormatter.format", "[y1rn.java-format]: %5$s");
    LogManager lm = LogManager.getLogManager();
    String logLevel = Level.WARNING.getName();
    // String logLevel = Level.INFO.getName();
    try {
      lm.updateConfiguration(
          (k) ->
              (o, n) -> {
                switch (k) {
                  case ".level":
                    // return getValue(k, "OFF");
                    return getValue(k, logLevel);
                  case "handlers":
                    return getValue(k, "java.util.logging.ConsoleHandler");
                  case "java.util.logging.FileHandler.encoding":
                    return getValue(k, "UTF-8");
                  case "java.util.logging.ConsoleHandler.encoding":
                    return getValue(k, "UTF-8");
                  case "java.util.logging.ConsoleHandler.level":
                    return getValue(k, logLevel);
                  case "java.util.logging.FileHandler.pattern":
                    return getValue(
                        k, System.getProperty("java.io.tmpdir") + File.separator + "rpc.log");
                  case "java.util.logging.FileHandler.formatter":
                    return getValue(k, "java.util.logging.SimpleFormatter");
                  default:
                    String v = getValue(k, "java.util.logging.SimpleFormatter");
                    return Strings.isNullOrEmpty(v) ? n : v;
                }
              });
    } catch (IOException e) {
      e.printStackTrace();
    }
  }

  public static String getValue(String key, String def) {
    String v = System.getenv(key);
    if (Strings.isNullOrEmpty(v)) {
      v = System.getProperty(key);
    }
    return Strings.isNullOrEmpty(v) ? def : v;
  }
}
