import type { QuestionTemplate } from '../../types';
import { compositeArea, quadrilaterals, rectanglesAndTriangles } from './area';
import { circumference, polygonPerimeter, semicirclesAndComposites } from './perimeter';
import { checkRightAngle, hypotenuse } from './pythagoras';
import { pythagorasProblems, triplesAndSquares } from './pythagoras-applied';
import { averageSpeed, distanceTimeGraphs, speedDistanceTime } from './speed';
import { derivedUnits, metricConversions, metricPrefixes, timeCalculations } from './units';

// Templates for the measurement strand. Each file exports templates; list them here.
export const templates: QuestionTemplate[] = [
  // m9.mea.units
  metricConversions,
  metricPrefixes,
  derivedUnits,
  timeCalculations,
  // m9.mea.perimeter-circles
  polygonPerimeter,
  circumference,
  semicirclesAndComposites,
  // m9.mea.area
  rectanglesAndTriangles,
  quadrilaterals,
  compositeArea,
  // m9.mea.pythagoras
  hypotenuse,
  checkRightAngle,
  triplesAndSquares,
  pythagorasProblems,
  // m9.mea.speed
  speedDistanceTime,
  averageSpeed,
  distanceTimeGraphs,
];
