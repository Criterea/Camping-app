import { View, ViewStyle, StyleSheet } from 'react-native';
import { Colors } from '@/theme';

type Props = {
  children?: React.ReactNode;
  style?: ViewStyle;
};

export function PaperBackground({ children, style }: Props) {
  return <View style={[styles.root, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
});
