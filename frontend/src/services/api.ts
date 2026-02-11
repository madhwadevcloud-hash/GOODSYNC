// TypeScript shim to re-export the JS module for type-checked imports
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as ApiNs from './api.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const authAPI = (ApiNs as any).authAPI;
export const schoolAPI = (ApiNs as any).schoolAPI;
export const userAPI = (ApiNs as any).userAPI;
export const admissionAPI = (ApiNs as any).admissionAPI;
export const assignmentAPI = (ApiNs as any).assignmentAPI;
export const attendanceAPI = (ApiNs as any).attendanceAPI;
export const apiUtils = (ApiNs as any).apiUtils;
export const classesAPI = (ApiNs as any).classesAPI;
export const feesAPI = (ApiNs as any).feesAPI;
export const classAPI = (ApiNs as any).classAPI;
export const testAPI = (ApiNs as any).testAPI;
export const resultsAPI = (ApiNs as any).resultsAPI;
export default (ApiNs as any).default;
