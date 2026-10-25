import type { QuestionTemplate } from '../../types';
import { basicAngleFacts, parallelAlgebraAndProof, parallelLines } from './angles';
import { circleReasoning, nameThePart, radiusDiameter } from './circles';
import { cubeNets, facesEdgesVertices, identifyNets, views } from './nets';
import { reflections, rotations, translations } from './transformations';

// Templates for the geometry strand. Each file exports templates; list them here.
export const templates: QuestionTemplate[] = [
  // m9.geo.circles
  nameThePart,
  radiusDiameter,
  circleReasoning,
  // m9.geo.angles-parallel
  basicAngleFacts,
  parallelLines,
  parallelAlgebraAndProof,
  // m9.geo.transformations
  translations,
  reflections,
  rotations,
  // m9.geo.nets
  facesEdgesVertices,
  identifyNets,
  cubeNets,
  views,
];
