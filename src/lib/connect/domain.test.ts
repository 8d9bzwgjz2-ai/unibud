import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acceptRequest,
  authorizeService,
  canDirectMessage,
  cancelRequest,
  declineRequest,
  followUser,
  rankPeople,
  rankScore,
  rankServices,
  relationWith,
  removeConnection,
  sendRequest,
  visibleInSearch,
  nameConnectionAsker,
  type ConnectRequest,
  type DiscoverPerson,
} from "./domain.ts";

const ada: DiscoverPerson = {
  id: "ada",
  handle: "ada",
  name: "Ada Okonkwo",
  extra: "unilag medicine design",
  discoverable: true,
  verified: true,
};
const ben: DiscoverPerson = {
  id: "ben",
  handle: "ben",
  name: "Ben Ade",
  extra: "engineering",
  discoverable: false,
  verified: false,
};

describe("search", () => {
  it("ranks an exact handle above a partial name and ignores verification", () => {
    const exact = rankScore("ada", ada);
    const partial = rankScore("ada", { handle: "zada", name: "Adaeze", extra: "", verified: false });
    assert.ok(exact > partial);
    assert.equal(rankScore("ada", ada), rankScore("ada", { ...ada, verified: false }));
  });

  it("matches a username and an @handle the same as the handle", () => {
    const person = { ...ada, handle: "ada_o", username: "ada" };
    assert.equal(rankScore("@ada", person), 100);
    assert.equal(rankScore("ada", person), 100);
    assert.ok(rankScore("ada", person) > rankScore("ada", { handle: "zada", name: "Adaeze", extra: "", verified: false }));
  });

  it("matches a partial name and a close spelling", () => {
    const people = rankPeople("ad", [ada, { ...ben, discoverable: true, name: "Chidi" }]);
    assert.deepEqual(people.map((person) => person.id), ["ada"]);
    assert.equal(rankPeople("adda", [ada])[0]?.id, "ada");
    assert.deepEqual(rankPeople("unilag", [ada, { ...ben, discoverable: true }]).map((person) => person.id), ["ada"]);
  });

  it("hides the viewer, hidden profiles, and blocked people", () => {
    assert.equal(visibleInSearch(ada, "ada", []), false);
    assert.equal(visibleInSearch(ben, "ada", []), false);
    assert.equal(visibleInSearch(ada, "me", [{ blockerId: "me", blockedId: "ada" }]), false);
    assert.equal(visibleInSearch(ada, "me", []), true);
  });
});

describe("relationships", () => {
  const base: ConnectRequest = { id: "r1", fromId: "a", toId: "b", status: "pending" };

  it("sends, then refuses a duplicate", () => {
    assert.equal(sendRequest({ fromId: "a", toId: "b", requests: [], blocks: [], allowRequests: true }).ok, true);
    const again = sendRequest({ fromId: "a", toId: "b", requests: [base], blocks: [], allowRequests: true });
    assert.equal(again.ok, false);
  });

  it("shows Accept for an incoming request even if an older outgoing one is listed first", () => {
    const outgoing = { id: "out", fromId: "b", toId: "a", status: "pending" as const };
    const incoming = { id: "in", fromId: "a", toId: "b", status: "pending" as const };
    const relation = relationWith([outgoing, incoming], "b", "a");
    assert.equal(relation.requestId, "in");
    assert.equal(relation.requestFromMe, false);
    assert.equal(relation.requestStatus, "pending");
  });

  it("accepts only for the recipient and decline does not connect", () => {
    assert.equal(acceptRequest(base, "b").ok, true);
    assert.equal(acceptRequest(base, "a").ok, false);
    assert.equal(declineRequest(base, "b").ok, true);
    assert.equal(acceptRequest({ ...base, status: "declined" }, "b").ok, false);
  });

  it("lets the sender cancel and either person remove a connection", () => {
    assert.equal(cancelRequest(base, "a").ok, true);
    assert.equal(cancelRequest(base, "b").ok, false);
    const accepted = { ...base, status: "accepted" as const };
    assert.equal(removeConnection(accepted, "b").ok, true);
    assert.equal(removeConnection(base, "a").ok, false);
  });

  it("only delivers a message to a connected person who allows them", () => {
    const accepted = { ...base, status: "accepted" as const };
    assert.equal(canDirectMessage({ fromId: "a", toId: "b", blocks: [], requests: [accepted], allowMessages: true }).ok, true);
    assert.equal(canDirectMessage({ fromId: "a", toId: "b", blocks: [], requests: [base], allowMessages: true }).ok, false);
    assert.equal(canDirectMessage({ fromId: "a", toId: "b", blocks: [], requests: [accepted], allowMessages: false }).ok, false);
    assert.equal(canDirectMessage({ fromId: "a", toId: "a", blocks: [], requests: [], allowMessages: true }).ok, false);
  });

  it("follows one way, asks when approval is required, and blocks both directions", () => {
    assert.equal(followUser({ followerId: "a", followedId: "b", blocks: [], approval: false }).status, "active");
    assert.equal(followUser({ followerId: "a", followedId: "b", blocks: [], approval: true }).status, "pending");
    assert.equal(followUser({ followerId: "a", followedId: "b", blocks: [{ blockerId: "b", blockedId: "a" }], approval: false }).ok, false);
  });

  it("names the asker and handle when two people share a display name", () => {
    const askers = [
      { name: "Ada Okonkwo", handle: "ada_live", at: "2026-11-02T18:00:00.000Z" },
      { name: "Ben Adeyemi", handle: "ben_live", at: "2026-11-02T18:04:00.000Z" },
      { name: "Ada Okonkwo", handle: "ada_other", at: "2026-11-02T17:00:00.000Z" },
    ];
    const ada = nameConnectionAsker(
      { title: "New connection request", body: "Ada Okonkwo wants to connect." },
      askers,
      "2026-11-02T18:00:30.000Z",
    );
    assert.equal(ada.title, "Ada Okonkwo (@ada_live) asked to connect");
    assert.equal(ada.href, "/connect/people/ada_live");
    const ben = nameConnectionAsker(
      { title: "New connection request", body: "Ben Adeyemi wants to connect." },
      askers,
      "2026-11-02T18:04:00.000Z",
    );
    assert.equal(ben.title, "Ben Adeyemi (@ben_live) asked to connect");
    const already = nameConnectionAsker(
      { title: "Ada Okonkwo (@ada_live) asked to connect", body: "Accept or decline this request from Connect." },
      askers,
      "2026-11-02T18:00:00.000Z",
    );
    assert.equal(already.title, "Ada Okonkwo (@ada_live) asked to connect");
    const other = nameConnectionAsker(
      { title: "Lab closed", body: "The engineering lab is closed." },
      askers,
      "2026-11-02T18:00:00.000Z",
    );
    assert.equal(other.title, "Lab closed");
  });
});

describe("services", () => {
  it("refuses to mark an unavailable service as connected", () => {
    assert.equal(authorizeService("unavailable", ["profile"]).ok, false);
  });

  it("connects only an available service after a scope is approved", () => {
    const granted = authorizeService("available", ["name"]);
    assert.equal(granted.ok && granted.status, "connected");
    assert.equal(authorizeService("available", []).ok, false);
  });

  it("ranks an exact service name above a category mention", () => {
    const ranked = rankServices("flow", [
      { name: "Quad", category: "Education", description: "Clubs and flow of campus life" },
      { name: "Flow", category: "Finance", description: "Student money" },
    ]);
    assert.deepEqual(ranked.map((service) => service.name), ["Flow", "Quad"]);
  });
});
