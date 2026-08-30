import { BottomSheet, Button, Column, Host } from "@expo/ui";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

interface BottomSheetProps {
    isPresented: boolean;
    onDismiss: () => void;
    title?: string;
    children: ReactNode;

}

export default function BottomSheetComponent({
    isPresented,
    onDismiss,
    title,
    children,
}: BottomSheetProps) {
    return (
        <Host style={styles.host}>
            <BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
                <Column spacing={16}>
                    <View style={styles.sheet}>
                        <View style={styles.handle} />

                        {title ? (
                            <View style={styles.header}>
                                <Text style={styles.title}>{title}</Text>
                            </View>
                        ) : null}

                        <View style={styles.content}>
                            {children}
                        </View>

                        <View style={styles.footer}>
                            <Button
                                label="Cancel"
                                variant="text"
                                onPress={onDismiss}
                            />
                        </View>
                    </View>

            
                </Column>
            </BottomSheet>
        </Host>
    );
}

const styles = StyleSheet.create({
    host: {
        width: "100%",
    },
    sheet: {
        width: "100%",
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 12,
        backgroundColor: "#ffffff",
    },
    handle: {
        alignSelf: "center",
        width: 42,
        height: 5,
        borderRadius: 999,
        backgroundColor: "#d6dee8",
        marginBottom: 14,
    },
    header: {
        alignItems: "center",
        paddingHorizontal: 10,
        paddingBottom: 4,
    },
    title: {
        color: "#172033",
        fontSize: 20,
        fontWeight: "900",
        lineHeight: 26,
        textAlign: "center",
    },
    content: {
        gap: 10,
        paddingTop: 10,
    },
    footer: {
        paddingTop: 6,
    },
});
