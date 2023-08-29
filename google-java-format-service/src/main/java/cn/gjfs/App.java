package cn.gjfs;

import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.DefaultParser;
import org.apache.commons.cli.Options;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;

public class App {
  public static void main(String[] args) throws Exception {
    Options option = new Options();
    option.addOption("p", "port", true, "google-java-format service port");
    CommandLine cmd = new DefaultParser().parse(option, args);
    int port;
    try {
      port = Integer.parseInt(cmd.getOptionValue("p", "8030"));
    } catch (NumberFormatException ex) {
      System.out.println(ex.getMessage());
      throw ex;
    }

    Server server = new Server(port);
    ServletContextHandler context = new ServletContextHandler(ServletContextHandler.NO_SESSIONS);
    context.setContextPath("/");
    context.addServlet(GoogleFormatServlet.class, "/files");
    server.setHandler(context);
    server.start();
    server.join();
  }
}
