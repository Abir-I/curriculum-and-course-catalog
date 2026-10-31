// Module 2 asks the Registration module (through its API) about seats and enrolments.
// Tests replace the client with fakeRegistration() from tests/helpers/fakes.js.
let impl = null;

export function setRegistrationClient(client) {
  impl = client;
}

function client() {
  if (!impl) throw new Error("Registration client not configured");
  return impl;
}

export const occupancy = (sectionId) => client().occupancy(sectionId);
export const enrolmentStatus = (sectionId) => client().enrolmentStatus(sectionId);
