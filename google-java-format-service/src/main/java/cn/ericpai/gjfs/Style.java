package cn.ericpai.gjfs;

import com.google.googlejavaformat.java.JavaFormatterOptions;

public enum Style {
  GOOGLE,
  AOSP;

  public JavaFormatterOptions.Style GetGoogleJavaFormatterStyle() {
    switch (this) {
      case AOSP:
        return JavaFormatterOptions.Style.AOSP;
      default:
        return JavaFormatterOptions.Style.GOOGLE;
    }
  }
}
