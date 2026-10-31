// Fake clients for the other modules. Module 2 never calls the real Registration module in tests.
// fakeRegistration({ occupancy: 12, enrolled: false })  -> answers normally
// fakeRegistration({ down: true })                      -> every call fails, like a module that is down
export function fakeRegistration({ occupancy = 0, enrolled = false, down = false } = {}) {
  const fail = () => Promise.reject(new Error("Registration module unavailable"));
  return {
    occupancy: down ? fail : async () => occupancy,
    enrolmentStatus: down ? fail : async () => ({ enrolled }),
  };
}
