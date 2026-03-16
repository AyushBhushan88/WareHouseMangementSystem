export enum SerialFormat {
  GS1_128 = 'GS1_128',
  INTERNAL_SER = 'INTERNAL_SER',
  UNKNOWN = 'UNKNOWN'
}

export class SerialIdentifier {
  // Regex for internal serials like "SER-A100"
  private static INTERNAL_SER_REGEX = /^SER-[A-Z][0-9]+$/

  // Regex for GS1-128 AI(21) - very simplified for this example
  private static GS1_21_REGEX = /^\(21\)[A-Z0-9]{1,20}$/

  /**
   * Detects the format of a serial number and validates its structure.
   */
  static identify(serial: string): SerialFormat {
    if (this.INTERNAL_SER_REGEX.test(serial)) {
      return SerialFormat.INTERNAL_SER
    }
    if (this.GS1_21_REGEX.test(serial)) {
      return SerialFormat.GS1_128
    }
    return SerialFormat.UNKNOWN
  }

  /**
   * Throws an error if the serial format is invalid/unknown.
   */
  static validate(serial: string): void {
    const format = this.identify(serial)
    if (format === SerialFormat.UNKNOWN) {
      throw new Error(`Invalid or unrecognized serial format: ${serial}`)
    }
  }

  /**
   * Extracts the raw serial data from a barcode string.
   */
  static parse(barcode: string): string {
    const format = this.identify(barcode)
    if (format === SerialFormat.GS1_128) {
      return barcode.replace('(21)', '')
    }
    return barcode
  }
}
