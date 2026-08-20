import { BottomSheet, Button, Column, Host } from "@expo/ui";
import { StyleSheet, Text, View } from "react-native";

interface BottomSheetProps {
    isPresented: boolean;
    onDismiss: () => void;
    onConfirm: () => void;
    title?: string;
    confirmLabel?: string;
}

export default function BottomSheetComponent({
    isPresented,
    onDismiss,
    onConfirm,
    title,
    confirmLabel,
}: BottomSheetProps) {
    return (
        <Host style={styles.bottomSheet}>
            <BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
                <Column spacing={14}>
                    <View style={styles.handle} />
                    <Text style={styles.title}>{title}</Text>

                    <Button
                        label={confirmLabel ?? "Confirm"}
                    
                        onPress={onConfirm}
                    />

                    <Button
                        label="Cancel"
                        variant="text"
                        onPress={onDismiss}
                    />

            
                </Column>
            </BottomSheet>
        </Host>
    );
}

const styles = StyleSheet.create({
    bottomSheet: {
        flex: 1,
    },
    handle: {
        alignSelf: "center",
        width: 44,
        height: 5,
        borderRadius: 999,
        backgroundColor: "#cbd5e1",
        marginBottom: 6,
    },
    title: {
        color: "#172033",
        fontSize: 18,
        fontWeight: "800",
        lineHeight: 24,
        textAlign: "center",
    },
});
