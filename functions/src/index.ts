// Cloud Functions entry point. Region and global options are set in lib/firebase.ts.
import './lib/firebase';

export {
  completeOnboarding,
  checkUsername,
  createChildAccount,
  resetChildPassword,
  setYearLevel,
  renameChild,
  deleteChildAccount,
  deleteMyAccount,
  exportMyData,
} from './callables/account';
export { createInvite, emailInvite, peekInvite, acceptInvite, unlink } from './callables/family';
export { getPracticeSet, submitAnswer, selfMark, flagQuestion, logActivity } from './callables/practice';
export { startExam, submitExam, selfMarkExam } from './callables/exams';
export { adminReviewQueue, adminSetQuestionStatus, adminStats } from './callables/admin';

export { saveAiKey, deleteAiKey, setAiPrefs, getAiStatus } from './ai/keys';
export { tutorChat } from './ai/tutor';
export { generateQuestions } from './ai/generate';
export { aiMarkAttempt, aiMarkExam, markWorking } from './ai/marking';
export { analyseNotes } from './ai/notes';

export { oauthGetRequest, oauthDecide, createApiToken, listConnections, revokeConnection } from './mcp/auth';
export { mcp } from './mcp/server';

export { weeklySummary, promoteQuestions, cleanup } from './scheduled/jobs';
