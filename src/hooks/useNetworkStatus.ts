import { create } from "zustand";
import NetInfo from "@react-native-community/netinfo";

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  initialize: () => () => void; // returns unsubscribe
}

export const useNetworkStatus = create<NetworkState>((set) => ({
  isConnected: false, // assume offline until NetInfo confirms
  isInternetReachable: false,

  initialize: () => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      set({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
      });
    });
    return unsubscribe;
  },
}));
