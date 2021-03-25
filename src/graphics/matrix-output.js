import {
  drawPath,
  getFontHeight,
  getTextWidth,
  roundToString,
} from '../index';
import { rtv } from '../resources';

/**
 * Draws a pair of vertical rectangular brackets.
 * @param {number} x Top-left `x` coordinate.
 * @param {number} y Top-left `y` coordinate.
 * @param {number} width Distance between brackets.
 * @param {number} height Height of brackets.
 * @param {number} fingerLength
 * Length of short horizontal block on top and bottom of bracket in pixels.
 */
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

        return (x, y, elementCallback) => this
          .columnWidths.reduceRight((pointerX, cw, columnIndex) => {
            if (elementCallback instanceof Function) {
              elementCallback(rowIndex, columnIndex);
            }

            elementDrawFunctions[columnIndex](
              pointerX, y,
              undefined,
              cw, this.rowHeights[rowIndex],
              true, this.ctx,
            );

            return pointerX - cw - this.padding;
          }, x - this.padding);
      }

      const str = roundToString(row);

      const rowWidth = getTextWidth(str);
      MatrixOutput.updateLayout(this.columnWidths, 0, rowWidth);

      this.rowHeights[rowIndex] = getFontHeight();

      return (x, y) => this.ctx.fillText(str, x - this.padding, y);
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
        const str = roundToString(element);

        width = getTextWidth(str);
        height = getFontHeight();

        draw = (x, y) => this.ctx.fillText(str, x, y);
      }

      MatrixOutput.updateLayout(this.columnWidths, columnIndex, width);
      MatrixOutput.updateLayout(this.rowHeights, rowIndex, height);

      return draw;
    });
  }

  /**
   * Draws matrix contents onto canvas.
   * @param {number} x Top-right `x` coordinate.
   * @param {number} y Top-left `y` coordinate.
   * @param {number} width The width of the matrix.
   */
  drawInterior(x, y, elementCallback) {
    this.rowHeights.reduce((pointerY, rh, rowIndex) => {
      this.rowDrawFunctions[rowIndex](x, pointerY, elementCallback);

      return pointerY + rh + this.padding;
    }, y + this.padding);
  }

  /**
   * Draws matrix onto canvas.
   * @param {number} x Top-left (or right; see below) `x` coordinate.
   * @param {number} y Top-left `y` coordinate.
   * @param {(rowIndex: number, columnIndex: number) => void} elementCallback
   * Called before each matrix element is drawn.
   * @param {number} width Optional onscreen matrix width.
   * @param {number} height Optional onscreen matrix height.
   * @param {boolean} right If true, `x` will be considered the top-right coordinate.
   */
  draw(x, y, elementCallback = undefined, width = this.width, height = this.height, right = false) {
    this.ctx.save();

    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';

    this.drawInterior(right ? x : x + width, y, elementCallback);

    drawBrackets(right ? x - width : x, y, width, height);

    this.ctx.restore();
  }
}
