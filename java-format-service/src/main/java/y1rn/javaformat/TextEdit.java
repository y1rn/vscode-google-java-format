package y1rn.javaformat;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@ToString
@NoArgsConstructor
public class TextEdit {

  Range range;
  String newText;

  public TextEdit(String text, int startLine, int startChar, int endLine, int endChar) {

    this.newText = text;
    Position starPosition = new Position(startLine, startChar);
    Position endPosition = new Position(endLine, endChar);
    this.range = new Range(starPosition, endPosition);
  }

  @Data
  @ToString
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Range {
    Position start;
    Position end;
  }

  @Data
  @ToString
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Position {
    int line;
    int character;
  }
}

