export type ParameterValue = string | number | boolean;

export interface Link {
  satisfies?: string;
  [key: string]: unknown;
}

export interface ArtifactRef {
  artifact: string;
  description?: string;
}

export interface Requirement {
  id: string;
  title: string;
  require: string;
  refinement: string;
  attributes?: Record<string, unknown>;
  links?: Link[];
  satisfied_by?: ArtifactRef[];
  verified_by?: ArtifactRef[];
  parameters?: Record<string, ParameterValue>;
}

export interface RequirementWithSource extends Requirement {
  sourcePath: string;
  categoryPath?: string[];
}

export interface ValidationError {
  path: string;
  message: string;
  line?: number;
}

export type SourceLinkKind = "implements" | "verifies";

/** GRD-SYS-017: Collected association of a requirement with a located source artifact. */
export interface SourceLink {
  requirementId: string;
  kind: SourceLinkKind;
  path: string;
  item: string;
  linespace: number[];
}

export interface LoadResult {
  requirements: RequirementWithSource[];
  errors: ValidationError[];
  /** GRD-UI-009 / GRD-SYS-018: Rust tracing attributes collected for the loaded project. */
  sourceLinks: SourceLink[];
}

export interface DiscoverResult {
  rootDir: string;
  requirementPaths: string[];
}

export type ArtifactLinkRenderOptions = {
  github?: {
    host?: string;
    owner: string;
    repo: string;
    commitSha: string;
    projectRootRel: string;
    projectRoot?: string;
  };
};

export type RequirementSchemaComposeOptions = Record<string, never>;
