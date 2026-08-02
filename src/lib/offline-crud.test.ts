import { isOffline, tempDependencies } from "./offline-crud";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

beforeEach(() => {
  // default store state: assume offline until NetInfo confirms otherwise
  useNetworkStatus.setState({ isConnected: false, isInternetReachable: false });
});

describe("isOffline", () => {
  it("is offline when disconnected", () => {
    useNetworkStatus.setState({ isConnected: false, isInternetReachable: true });
    expect(isOffline()).toBe(true);
  });

  it("is offline on a captive portal (connected but unreachable)", () => {
    useNetworkStatus.setState({ isConnected: true, isInternetReachable: false });
    expect(isOffline()).toBe(true);
  });

  it("is online when connected and reachable", () => {
    useNetworkStatus.setState({ isConnected: true, isInternetReachable: true });
    expect(isOffline()).toBe(false);
  });

  it("is online when reachability is unknown (null)", () => {
    useNetworkStatus.setState({ isConnected: true, isInternetReachable: null });
    expect(isOffline()).toBe(false);
  });
});

describe("tempDependencies", () => {
  it("collects temp ids from any payload field", () => {
    const deps = tempDependencies({
      currency_id: "tmp_currency1",
      category_id: "tmp_category1",
      account_id: "tmp_account01",
      preset_id: "tmp_preset001",
    });
    expect(deps.sort()).toEqual([
      "tmp_account01",
      "tmp_category1",
      "tmp_currency1",
      "tmp_preset001",
    ]);
  });

  it("ignores non-temp values and non-strings", () => {
    expect(
      tempDependencies({ category_id: "real-uuid", amount: 100, title: "tmp_ not a dep" }),
    ).toEqual([]);
  });

  it("returns [] for an empty input", () => {
    expect(tempDependencies({})).toEqual([]);
  });
});
