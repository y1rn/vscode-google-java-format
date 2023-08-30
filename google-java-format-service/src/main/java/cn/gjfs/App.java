package cn.gjfs;

import java.nio.file.Path;

import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.DefaultParser;
import org.apache.commons.cli.Options;
import org.eclipse.jetty.server.HttpConnectionFactory;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.unixdomain.server.UnixDomainServerConnector;

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
    Server server;
    if (unixSocketPath != null) {
      server = new Server();
      // The number of acceptor threads.
      int acceptors = 1;
      // The number of selectors.
      int selectors = 1;
      // Create a ServerConnector instance.
      UnixDomainServerConnector connector = new UnixDomainServerConnector(server, acceptors, selectors, new HttpConnectionFactory());
      connector.setInheritChannel(true);
      // The Unix-Domain path to listen to.
      connector.setUnixDomainPath(Path.of(unixSocketPath));
      // The TCP accept queue size.
      connector.setAcceptQueueSize(128);
      server.addConnector(connector);
    }else {
      server = new Server(port);
    }
    ServletContextHandler context = new ServletContextHandler(ServletContextHandler.NO_SESSIONS);
    context.setContextPath("/");
    context.addServlet(GoogleFormatServlet.class, "/files");
    server.setHandler(context);
    server.start();
    server.join();
  }
}
