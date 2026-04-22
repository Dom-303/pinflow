/**
 * Configuration types for the Babel parser
 * @module @pinflow/transform/parsers/babel/types
 */
import { ParserPlugin } from '@babel/parser';

/**
 * Options for BabelParser initialization
 */
export interface BabelParserOptions {
  typescript?: boolean;
  jsx?: boolean;
  plugins?: ParserPlugin[];
}
