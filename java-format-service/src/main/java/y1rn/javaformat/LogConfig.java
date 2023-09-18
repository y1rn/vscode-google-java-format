package y1rn.javaformat;

import java.io.File;
import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.LogManager;

import com.google.common.base.Strings;

public class LogConfig {

  private static boolean loaded;
  static {
    init();
  }

  private LogConfig(){}

  public static synchronized void init() {
    if (loaded) {
      return;
    }
    LogManager lm = LogManager.getLogManager();
    String logLevel = Level.SEVERE.getName();
    System.setProperty("java.util.logging.SimpleFormatter.format", "[y1rn.java-format]: %5$s");
    try {
      lm.updateConfiguration(
          k ->
              (o, n) -> {
                switch (k) {
                  case ".level":
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
    loaded = true;
  }

  public static String getValue(String key, String def) {
    String v = System.getenv(key);
    if (Strings.isNullOrEmpty(v)) {
      v = System.getProperty(key);
    }
    return Strings.isNullOrEmpty(v) ? def : v;
  } 
}
