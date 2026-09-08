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

export interface LoadResult {
  requirements: RequirementWithSource[];
  errors: ValidationError[];
}

export interface DiscoverResult {
  rootDir: string;
  requirementPaths: string[];
}

export type ArtifactLinkRenderOptions = {
  github?: {
    owner: string;
    repo: string;
    commitSha: string;
    projectRootRel: string;
  };
};

export type RequirementSchemaComposeOptions = Record<string, never>;
