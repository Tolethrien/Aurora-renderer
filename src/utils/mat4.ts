type Vec3 = [number, number, number];
type Vec4 = [number, number, number, number];

export default class Mat4 {
  private matrix: Float32Array;
  private static readonly EPSILON = 0.000001;

  private constructor(data?: number[] | Float32Array) {
    this.matrix = data ? new Float32Array(data) : Mat4.createIdentityArray();
  }

  private static createIdentityArray(): Float32Array {
    const m = new Float32Array(16);
    m[0] = 1; // col 1
    m[5] = 1; // col 2
    m[10] = 1; // col 3
    m[15] = 1; // col 4
    return m;
  }

  /**
   * Tworzy nową macierz jednostkową.
   */
  public static create(): Mat4 {
    return new Mat4();
  }

  /**
   * Zwraca wewnętrzną tablicę Float32Array macierzy.
   */
  public get getMatrix(): Float32Array {
    return this.matrix;
  }

  /**
   * Tworzy i zwraca dokładną kopię tej macierzy.
   */
  public clone(): Mat4 {
    return new Mat4(this.matrix);
  }

  /**
   * Kopiuje wartości z innej macierzy do tej macierzy.
   * @param other Macierz źródłowa.
   * @returns Referencja do tej macierzy.
   */
  public set(other: Mat4): this {
    this.matrix.set(other.matrix);
    return this;
  }

  /**
   * Resetuje macierz do macierzy jednostkowej.
   * @returns Referencja do tej macierzy.
   */
  public identity(): this {
    const m = this.matrix;
    m[0] = 1;
    m[1] = 0;
    m[2] = 0;
    m[3] = 0;
    m[4] = 0;
    m[5] = 1;
    m[6] = 0;
    m[7] = 0;
    m[8] = 0;
    m[9] = 0;
    m[10] = 1;
    m[11] = 0;
    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;
    return this;
  }

  /**
   * Mnoży tę macierz przez inną macierz (this = this * other).
   * @param other Macierz, przez którą ma być pomnożona ta macierz.
   * @returns Referencja do tej macierzy.
   */
  public multiply(other: Mat4): this {
    const a = this.clone().matrix;
    const b = other.matrix;
    const out = this.matrix;

    const a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
    const a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
    const a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
    const a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];

    const b00 = b[0],
      b01 = b[1],
      b02 = b[2],
      b03 = b[3];
    const b10 = b[4],
      b11 = b[5],
      b12 = b[6],
      b13 = b[7];
    const b20 = b[8],
      b21 = b[9],
      b22 = b[10],
      b23 = b[11];
    const b30 = b[12],
      b31 = b[13],
      b32 = b[14],
      b33 = b[15];

    out[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
    out[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
    out[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
    out[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
    out[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
    out[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
    out[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
    out[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
    out[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
    out[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
    out[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
    out[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
    out[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
    out[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;

    return this;
  }

  /**
   * Przesuwa macierz o podany wektor.
   * @param v Wektor przesunięcia [x, y, z].
   * @returns Referencja do tej macierzy.
   */
  public translate(v: Vec3): this {
    const m = this.matrix;
    const x = v[0],
      y = v[1],
      z = v[2];
    m[12] = m[0] * x + m[4] * y + m[8] * z + m[12];
    m[13] = m[1] * x + m[5] * y + m[9] * z + m[13];
    m[14] = m[2] * x + m[6] * y + m[10] * z + m[14];
    m[15] = m[3] * x + m[7] * y + m[11] * z + m[15];
    return this;
  }

  /**
   * Skaluje macierz o podany wektor.
   * @param v Wektor skalowania [x, y, z].
   * @returns Referencja do tej macierzy.
   */

  public scale(v: Vec3): this {
    const m = this.matrix;
    const x = v[0],
      y = v[1],
      z = v[2];
    m[0] *= x;
    m[1] *= x;
    m[2] *= x;
    m[3] *= x;
    m[4] *= y;
    m[5] *= y;
    m[6] *= y;
    m[7] *= y;
    m[8] *= z;
    m[9] *= z;
    m[10] *= z;
    m[11] *= z;
    return this;
  }

  /**
   * Generuje macierz projekcji ortograficznej (zgodną z WebGPU, Z: 0..1).
   * @returns Referencja do tej macierzy.
   */
  public ortho(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number
  ): this {
    const m = this.matrix;
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);

    m[0] = -2 * lr;
    m[1] = 0;
    m[2] = 0;
    m[3] = 0;
    m[4] = 0;
    m[5] = -2 * bt;
    m[6] = 0;
    m[7] = 0;
    m[8] = 0;
    m[9] = 0;
    m[10] = 2 * nf; // Poprawka dla zakresu [-1, 1]
    m[11] = 0;
    m[12] = (left + right) * lr;
    m[13] = (top + bottom) * bt;
    m[14] = (far + near) * nf;
    m[15] = 1;

    return this;
  }

  /**
   * Generuje macierz widoku (look-at).
   * @param eye Pozycja kamery.
   * @param center Punkt, na który patrzy kamera.
   * @param up Wektor wskazujący "górę".
   * @returns Referencja do tej macierzy.
   */
  public lookAt(eye: Vec3, center: Vec3, up: Vec3): this {
    const m = this.matrix;
    const eyex = eye[0],
      eyey = eye[1],
      eyez = eye[2];

    if (
      Math.abs(eyex - center[0]) < Mat4.EPSILON &&
      Math.abs(eyey - center[1]) < Mat4.EPSILON &&
      Math.abs(eyez - center[2]) < Mat4.EPSILON
    ) {
      return this.identity();
    }

    let z0 = eyex - center[0];
    let z1 = eyey - center[1];
    let z2 = eyez - center[2];
    let len = 1 / Math.hypot(z0, z1, z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    let x0 = up[1] * z2 - up[2] * z1;
    let x1 = up[2] * z0 - up[0] * z2;
    let x2 = up[0] * z1 - up[1] * z0;
    len = Math.hypot(x0, x1, x2);
    if (!len) {
      x0 = 0;
      x1 = 0;
      x2 = 0;
    } else {
      len = 1 / len;
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }

    let y0 = z1 * x2 - z2 * x1;
    let y1 = z2 * x0 - z0 * x2;
    let y2 = z0 * x1 - z1 * x0;
    len = Math.hypot(y0, y1, y2);
    if (!len) {
      y0 = 0;
      y1 = 0;
      y2 = 0;
    } else {
      len = 1 / len;
      y0 *= len;
      y1 *= len;
      y2 *= len;
    }

    m[0] = x0;
    m[1] = y0;
    m[2] = z0;
    m[3] = 0;
    m[4] = x1;
    m[5] = y1;
    m[6] = z1;
    m[7] = 0;
    m[8] = x2;
    m[9] = y2;
    m[10] = z2;
    m[11] = 0;
    m[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    m[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    m[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    m[15] = 1;

    return this;
  }

  /**
   * Odwraca macierz. Zwraca `null`, jeśli macierz jest nieodwracalna.
   * @returns Referencja do tej macierzy lub `null`.
   */
  public invert(): this | null {
    const m = this.matrix;
    const out = this.matrix;

    const m00 = m[0],
      m01 = m[1],
      m02 = m[2],
      m03 = m[3];
    const m10 = m[4],
      m11 = m[5],
      m12 = m[6],
      m13 = m[7];
    const m20 = m[8],
      m21 = m[9],
      m22 = m[10],
      m23 = m[11];
    const m30 = m[12],
      m31 = m[13],
      m32 = m[14],
      m33 = m[15];

    const b00 = m00 * m11 - m01 * m10;
    const b01 = m00 * m12 - m02 * m10;
    const b02 = m00 * m13 - m03 * m10;
    const b03 = m01 * m12 - m02 * m11;
    const b04 = m01 * m13 - m03 * m11;
    const b05 = m02 * m13 - m03 * m12;
    const b06 = m20 * m31 - m21 * m30;
    const b07 = m20 * m32 - m22 * m30;
    const b08 = m20 * m33 - m23 * m30;
    const b09 = m21 * m32 - m22 * m31;
    const b10 = m21 * m33 - m23 * m31;
    const b11 = m22 * m33 - m23 * m32;

    let det =
      b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (Math.abs(det) < Mat4.EPSILON) {
      console.error("Matrix is not invertible.");
      return null;
    }
    det = 1.0 / det;

    out[0] = (m11 * b11 - m12 * b10 + m13 * b09) * det;
    out[1] = (m02 * b10 - m01 * b11 - m03 * b09) * det;
    out[2] = (m31 * b05 - m32 * b04 + m33 * b03) * det;
    out[3] = (m22 * b04 - m21 * b05 - m23 * b03) * det;
    out[4] = (m12 * b08 - m10 * b11 - m13 * b07) * det;
    out[5] = (m00 * b11 - m02 * b08 + m03 * b07) * det;
    out[6] = (m32 * b02 - m30 * b05 - m33 * b01) * det;
    out[7] = (m20 * b05 - m22 * b02 + m23 * b01) * det;
    out[8] = (m10 * b10 - m11 * b08 + m13 * b06) * det;
    out[9] = (m01 * b08 - m00 * b10 - m03 * b06) * det;
    out[10] = (m30 * b04 - m31 * b02 + m33 * b00) * det;
    out[11] = (m21 * b02 - m20 * b04 - m23 * b00) * det;
    out[12] = (m11 * b07 - m10 * b09 - m12 * b06) * det;
    out[13] = (m00 * b09 - m01 * b07 + m02 * b06) * det;
    out[14] = (m31 * b01 - m30 * b03 - m32 * b00) * det;
    out[15] = (m20 * b03 - m21 * b01 + m22 * b00) * det;

    return this;
  }

  /**
   * Transformuje wektor 4D przez tę macierz.
   * @param vec Wektor do transformacji.
   * @returns Nowy, przetransformowany wektor.
   */
  public transform(vec: Vec4): Vec4 {
    const m = this.matrix;
    const x = vec[0],
      y = vec[1],
      z = vec[2],
      w = vec[3];
    return [
      m[0] * x + m[4] * y + m[8] * z + m[12] * w,
      m[1] * x + m[5] * y + m[9] * z + m[13] * w,
      m[2] * x + m[6] * y + m[10] * z + m[14] * w,
      m[3] * x + m[7] * y + m[11] * z + m[15] * w,
    ];
  }
}
