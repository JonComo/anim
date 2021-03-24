import { drawPath } from '../index';
import { rtv } from '../resources';

export function drawBrackets(x, y, width, height, fingerLength = 8) {
  drawPath([
    [x + fingerLength, y],
    [x, y],
    [x, y + height],
    [x + fingerLength, y + height],
  ]);

  drawPath([
    [x + width - fingerLength, y],
    [x + width, y],
    [x + width, y + height],
    [x + width - fingerLength, y + height],
  ]);
}

export function getTextWidth(text, ctx = rtv.ctx) {
  return ctx.measureText(text).width;
}

export function getFontHeight(ctx = rtv.ctx) {
  return parseInt(ctx.font.match(/(\d+)px/)[1], 10);
}

/**
 * @property {number} width The width of the matrix onscreen.
 * @property {number} height The height of the matrix onscreen.
 */
export default class MatrixOutput {
  /**
   * Lays out a matrix on `ctx` and prepares it to be drawn.
   * @param {Array} matrix The matrix to be layed out.
   * @param {number} padding Space in pixels between elements and brackets.
   * @param {CanvasRenderingContext2D} ctx Optionally specify a context instead of `rtv.ctx`.
   */
  constructor(matrix, padding = 16, ctx = rtv.ctx) {
    // Store arguments for later use
    this.matrix = matrix;
    this.padding = padding;
    this.ctx = ctx;

    this.columnWidths = [];
    this.rowHeights = [];

    this.generateRowDrawFunctions();

    this.width = this.columnWidths.reduce((a, b) => a + b + this.padding, this.padding);
    this.height = this.rowHeights.reduce((a, b) => a + b + this.padding, this.padding);
  }

  /**
   * Updates `sizes[index]` to `newVal` if it is undefined or is smaller than `newVal`.
   * @param {number[]} sizes Array of sizes (widths or heights).
   * @param {number} index Index of element to be replaced.
   * @param {number} newVal Value to replace `sizes[index]` with.
   */
  static updateLayout(sizes, index, newVal) {
    const oldVal = sizes[index];

    if (oldVal === undefined || oldVal < newVal) {
      sizes[index] = newVal;
    }
  }

  /**
   * Generates and stores an array of draw functions for each row of matrix.
   */
  generateRowDrawFunctions() {
    this.rowDrawFunctions = this.matrix.map((row, rowIndex) => {
      if (row instanceof Array) {
        const elementDrawFunctions = this.generateElementDrawFunctions(row, rowIndex);

        return (x, y) => this.columnWidths.reduce((pointerX, cw, columnIndex) => {
          elementDrawFunctions[columnIndex](pointerX, y, cw, this.rowHeights[rowIndex]);

          return pointerX + cw + this.padding;
        }, x + this.padding);
      }

      const str = row.toString();

      const rowWidth = getTextWidth(str);
      MatrixOutput.updateLayout(this.columnWidths, 0, rowWidth);

      this.rowHeights[rowIndex] = getFontHeight();

      return (x, y) => this.ctx.fillText(str, x + this.padding + this.columnWidths[0], y);
    });
  }

  /**
   * Generates and returns an array of draw functions for each element in `row`.
   * @param {Array} row
   * @param {number} rowIndex
   * @returns {(x: number, y: number) => void} Array of draw functions.
   */
  generateElementDrawFunctions(row, rowIndex) {
    return row.map((element, columnIndex) => {
      let width;
      let height;
      let draw;

      if (element instanceof Array) {
        const childMatrix = new MatrixOutput(element);
        ({ width, height } = childMatrix);
        draw = childMatrix.draw.bind(childMatrix);
      } else {
        const str = element.toString();

        width = getTextWidth(str);
        height = getFontHeight();

        draw = (x, y) => this.ctx.fillText(str, x + this.columnWidths[columnIndex], y);
      }

      MatrixOutput.updateLayout(this.columnWidths, columnIndex, width);
      MatrixOutput.updateLayout(this.rowHeights, rowIndex, height);

      return draw;
    });
  }

  /**
   * Draws matrix contents onto canvas.
   * @param {number} x Top-left `x` coordinate.
   * @param {number} y Top-left `y` coordinate.
   */
  drawInterior(x, y) {
    this.rowHeights.reduce((pointerY, rh, rowIndex) => {
      this.rowDrawFunctions[rowIndex](x, pointerY);

      return pointerY + rh + this.padding;
    }, y + this.padding);
  }

  /**
   * Draws matrix onto canvas.
   * @param {number} x Top-left `x` coordinate.
   * @param {number} y Top-left `y` coordinate.
   * @param {number} width Optional onscreen matrix width.
   * @param {number} height Optional onscreen matrix height.
   */
  draw(x, y, width = this.width, height = this.height) {
    this.ctx.save();

    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';

    this.drawInterior(x, y);

    drawBrackets(x, y, width, height);

    this.ctx.restore();
  }
}
