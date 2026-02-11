/**
 * FolderPickerModal — Browse filesystem to select a git repository folder.
 * Uses the /filesystem/browse backend API.
 */
import { useState, useEffect, useCallback } from "react";
import { Modal, Input, List, Typography, Flex, Spin, Button, Tag, Empty } from "antd";
import {
    FolderOutlined,
    FolderOpenOutlined,
    ArrowUpOutlined,
    HomeOutlined,
    BranchesOutlined,
    RightOutlined,
    ReloadOutlined,
} from "@ant-design/icons";
import filesystemService from "../../services/filesystemService";

const { Text } = Typography;

export default function FolderPickerModal({ open, onOk, onCancel }) {
    const [currentPath, setCurrentPath] = useState("");
    const [parentPath, setParentPath] = useState(null);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pathInput, setPathInput] = useState("");

    const browse = useCallback(async (path = "~") => {
        setLoading(true);
        try {
            const data = await filesystemService.browse(path);
            setCurrentPath(data.current);
            setParentPath(data.parent);
            setFolders(data.folders);
            setPathInput(data.current);
        } catch (err) {
            console.error("Browse failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) browse("~");
    }, [open, browse]);

    const handleNavigate = (folderPath) => {
        browse(folderPath);
    };

    const handleGoUp = () => {
        if (parentPath) browse(parentPath);
    };

    const handleGoHome = () => {
        browse("~");
    };

    const handlePathSubmit = () => {
        if (pathInput.trim()) browse(pathInput.trim());
    };

    const handleSelect = () => {
        onOk(currentPath);
    };

    const handleDoubleClick = (folder) => {
        if (folder.is_git) {
            onOk(folder.path);
        } else {
            handleNavigate(folder.path);
        }
    };

    return (
        <Modal
            title={
                <Flex align="center" gap={8}>
                    <FolderOpenOutlined style={{ color: "#818cf8" }} />
                    <span>Select Repository Folder</span>
                </Flex>
            }
            open={open}
            onOk={handleSelect}
            onCancel={onCancel}
            okText="Select This Folder"
            cancelText="Cancel"
            width={560}
            styles={{
                body: { padding: "12px 0" },
            }}
        >
            {/* Path bar */}
            <Flex gap={6} style={{ padding: "0 0 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Button
                    type="text" size="small" icon={<HomeOutlined />}
                    onClick={handleGoHome}
                    style={{ color: "rgba(255,255,255,0.45)" }}
                />
                <Button
                    type="text" size="small" icon={<ArrowUpOutlined />}
                    onClick={handleGoUp}
                    disabled={!parentPath}
                    style={{ color: "rgba(255,255,255,0.45)" }}
                />
                <Input
                    size="small"
                    value={pathInput}
                    onChange={(e) => setPathInput(e.target.value)}
                    onPressEnter={handlePathSubmit}
                    suffix={
                        <ReloadOutlined
                            style={{ color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 11 }}
                            onClick={handlePathSubmit}
                        />
                    }
                    style={{
                        flex: 1,
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: 12,
                    }}
                />
            </Flex>

            {/* Folder list */}
            <div style={{ height: 360, overflow: "auto", padding: "4px 0" }}>
                {loading ? (
                    <Flex align="center" justify="center" style={{ height: "100%" }}>
                        <Spin size="small" />
                    </Flex>
                ) : folders.length === 0 ? (
                    <Flex align="center" justify="center" style={{ height: "100%" }}>
                        <Empty
                            image={<div style={{ fontSize: 28, opacity: 0.4 }}>📂</div>}
                            description={<Text type="secondary" style={{ fontSize: 12 }}>No subfolders found</Text>}
                        />
                    </Flex>
                ) : (
                    <List
                        size="small"
                        dataSource={folders}
                        renderItem={(folder) => (
                            <List.Item
                                style={{
                                    padding: "6px 12px",
                                    cursor: "pointer",
                                    borderRadius: 6,
                                    margin: "1px 4px",
                                    border: folder.is_git
                                        ? "1px solid rgba(99, 102, 241, 0.15)"
                                        : "1px solid transparent",
                                    background: folder.is_git
                                        ? "rgba(99, 102, 241, 0.04)"
                                        : "transparent",
                                    transition: "all 0.15s ease",
                                }}
                                onClick={() => handleNavigate(folder.path)}
                                onDoubleClick={() => handleDoubleClick(folder)}
                            >
                                <Flex align="center" justify="space-between" style={{ width: "100%" }}>
                                    <Flex align="center" gap={10}>
                                        {folder.is_git ? (
                                            <BranchesOutlined style={{ fontSize: 14, color: "#818cf8" }} />
                                        ) : (
                                            <FolderOutlined style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }} />
                                        )}
                                        <div>
                                            <Text
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: folder.is_git ? 500 : 400,
                                                    color: folder.is_git ? "#a5b4fc" : undefined,
                                                }}
                                            >
                                                {folder.name}
                                            </Text>
                                            {folder.is_git && (
                                                <Tag
                                                    color="purple"
                                                    style={{
                                                        marginLeft: 8,
                                                        fontSize: 9,
                                                        lineHeight: "16px",
                                                        borderRadius: 4,
                                                    }}
                                                >
                                                    git repo
                                                </Tag>
                                            )}
                                        </div>
                                    </Flex>
                                    <Flex align="center" gap={8}>
                                        {folder.children_count > 0 && (
                                            <Text type="secondary" style={{ fontSize: 10, fontFamily: '"JetBrains Mono", monospace' }}>
                                                {folder.children_count}
                                            </Text>
                                        )}
                                        <RightOutlined style={{ fontSize: 9, color: "rgba(255,255,255,0.15)" }} />
                                    </Flex>
                                </Flex>
                            </List.Item>
                        )}
                    />
                )}
            </div>

            {/* Breadcrumb / current selection */}
            <Flex
                align="center"
                gap={8}
                style={{
                    padding: "10px 0 0",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>Selected:</Text>
                <Text
                    style={{
                        fontSize: 12,
                        fontFamily: '"JetBrains Mono", monospace',
                        color: "#a5b4fc",
                    }}
                    ellipsis
                >
                    {currentPath}
                </Text>
            </Flex>
        </Modal>
    );
}
