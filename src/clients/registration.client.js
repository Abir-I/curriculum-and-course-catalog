// Module 2 asks the Registration module (through its API) about seats and enrolments.
// Tests replace the client with fakeRegistration() from tests/helpers/fakes.js.
import { makeClientHolder } from "./client-holder.js";

const holder = makeClientHolder("Registration");

export const setRegistrationClient = holder.set;
export const occupancy = (sectionId) => holder.get().occupancy(sectionId);
export const enrolmentStatus = (sectionId) => holder.get().enrolmentStatus(sectionId);
