import { useColors } from "@/lib/hooks/useColors";
import { router } from "expo-router";
import { Component, type ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type FallbackProps = {
  onReload: () => void;
};

function ErrorFallback({ onReload }: FallbackProps) {
  const C = useColors();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.background,
        paddingHorizontal: 32,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: C.textPrimary,
          marginBottom: 8,
        }}
      >
        Algo salió mal
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: C.textTertiary,
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        La aplicación encontró un error inesperado.
      </Text>
      <TouchableOpacity
        onPress={onReload}
        activeOpacity={0.7}
        style={{
          backgroundColor: C.accent,
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 24,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "700", color: C.background }}>
          Recargar app
        </Text>
      </TouchableOpacity>
    </View>
  );
}

type InnerProps = { children: ReactNode };
type InnerState = { hasError: boolean };

class ErrorBoundaryInner extends Component<InnerProps, InnerState> {
  state: InnerState = { hasError: false };

  static getDerivedStateFromError(): InnerState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    router.replace("/");
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundaryInner>{children}</ErrorBoundaryInner>;
}
