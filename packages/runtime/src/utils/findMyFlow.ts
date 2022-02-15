import { IDENTITY } from "../type";

export default (who) => {
  if (who && who.identity === IDENTITY.NODE) return who && who.flow;
  if (who && who.identity === IDENTITY.PORT)
    return who && who.node && who.node.flow;
  return {};
};

