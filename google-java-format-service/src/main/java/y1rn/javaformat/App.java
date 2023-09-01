package y1rn.javaformat;

import com.google.common.base.Strings;

import java.io.File;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import com.sun.net.httpserver.HttpServer;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.DefaultParser;
import org.apache.commons.cli.Options;


public class App {
  public static void main(String[] args) throws Exception {
    Options option = new Options();
    option.addOption("p", "port", true, "google-java-format service port");
    option.addOption("s", "socket", true, "google-java-format service unix socket address");

    CommandLine cmd = new DefaultParser().parse(option, args);
    int port;
    String unixSocketPath;
    try {
      port = Integer.parseInt(cmd.getOptionValue("p", "8030"));
      unixSocketPath = cmd.getOptionValue("s");
    } catch (NumberFormatException ex) {
      System.out.println(ex.getMessage());
      throw ex;
    }
    HttpServer server;
    if (!Strings.isNullOrEmpty(unixSocketPath)) {
      File file = new File(unixSocketPath);
      if (file.isDirectory()) {
        throw new IllegalArgumentException("socket file is a directory");
      } else {
        Files.deleteIfExists(file.toPath());
      }
      // File socketFile = new File(unixSocketPath);
      // server =  HttpServer.create(afsa,0);
      
      // Runtime.getRuntime()
      //     .addShutdownHook(
      //         new Thread(
      //             () -> {
      //               try {
      //                 Files.deleteIfExists(file.toPath());
      //               } catch (IOException e) {
      //                 e.printStackTrace();
      //               }
      //             }));
    // } else {
    //   server = HttpServer.create(new InetSocketAddress("0.0.0.0", port),0);
    }
      server = HttpServer.create(new InetSocketAddress("0.0.0.0", port),0);


    server.createContext("/format",new FormatHandler());
    server.start();
  }
}
