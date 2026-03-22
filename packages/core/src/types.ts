/**
 * GRD-SYS-005: Parameter value type (string, number, or boolean).
 */
export type ParameterValue = string | number | boolean;

/**
 * Requirement schema: id, title, description, attributes, links, parameters.
 * Matches the YAML format used in requirement files.
 * GRD-SYS-005: parameters is a list of named parameters (name -> value) usable in text templates.
 */
export interface Requirement {
  id: string;
  title: string;
  description: string;
  attributes?: Record<string, unknown>;
  links?: Link[];
  /** GRD-SYS-005: Named parameters for templating in text fields. */
  parameters?: Record<string, ParameterValue>;
}

export interface Link {
  satisfies?: string;
  [key: string]: unknown;
}

export interface RequirementWithSource extends Requirement {
  /** Path to the YAML file this requirement was loaded from */
  sourcePath: string;
  /**
   * GRD-SYS-004: Path segments from the requirement_dir that contains this file
   * to the file's directory (relative). Empty = file is directly under a requirement_dir.
   */
  categoryPath?: string[];
}

export interface ProjectInfo {
  /** Absolute path to the project root (directory containing gitreqd.yaml or gitreqd.yml) */
  rootDir: string;
  /** Absolute paths to requirement YAML files under the project */
  requirementPaths: string[];
}

export interface ValidationError {
  path: string;
  message: string;
  line?: number;
}

export interface LoadResult {
  requirements: RequirementWithSource[];
  errors: ValidationError[];
}
