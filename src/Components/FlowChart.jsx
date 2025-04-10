import React from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Panel,
} from "@xyflow/react";
import axios from "axios";
import Modal from "react-modal";
import "@xyflow/react/dist/style.css";
import { useState, useCallback, useEffect } from "react";
import {
  Mail,
  Clock,
  User,
  Plus,
  Play,
  X,
  Save,
  Trash2,
  MessageSquare,
  AlertCircle,
} from "lucide-react";

Modal.setAppElement("#root");

const nodeTypes = {
  "Cold-Email": Mail,
  "Wait/Delay": Clock,
  "Lead-Source": User,
};

const customStyles = {
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    zIndex: 1000,
  },
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    borderRadius: "8px",
    padding: "24px",
    border: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    maxWidth: "500px",
    width: "90%",
  },
};

const getNodeStyle = (type) => {
  switch (type) {
    case "Cold-Email":
      return { backgroundColor: "#f0f9ff", borderColor: "#60a5fa" };
    case "Wait/Delay":
      return { backgroundColor: "#fef9c3", borderColor: "#facc15" };
    case "Lead-Source":
      return { backgroundColor: "#f0fdf4", borderColor: "#4ade80" };
    default:
      return { backgroundColor: "#f9fafb", borderColor: "#9ca3af" };
  }
};

function FlowChart() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [nodeCount, setNodeCount] = useState(0);
  const [selectedNodeType, setSelectedNodeType] = useState("Lead-Source");
  const [modalIsOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [editingNode, setEditingNode] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const addNode = (label, content) => {
    const newNodeId = (nodeCount + 1).toString();

    const newNode = {
      id: newNodeId,
      type: "default",
      data: {
        label: `${label}\n${content}`,
        nodeType: label,
      },
      position: { x: 100, y: nodeCount * 120 },
      style: {
        ...getNodeStyle(label),
        padding: "10px",
        borderWidth: "2px",
        borderStyle: "solid",
        borderRadius: "8px",
        width: 200,
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
      },
    };

    setNodes((nds) => nds.concat(newNode));
    setNodeCount((count) => count + 1);

    if (nodes.length > 0) {
      const newEdge = {
        id: `e${nodeCount}-${newNodeId}`,
        source: `${nodeCount}`,
        target: newNodeId,
        animated: true,
        style: { stroke: "#64748b", strokeWidth: 2 },
      };
      setEdges((eds) => eds.concat(newEdge));
    }
  };

  const handleAddNode = () => {
    if (selectedNodeType) {
      setModalContent(selectedNodeType);
      setIsOpen(true);
      setEditingNode(null);
    } else {
      showNotification("Please select a valid node type.", "error");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.target);
    const subject = formData.get("subject");
    const text = formData.get("content");
    const delay = formData.get("delay");
    const email = formData.get("email");
    let nodeContent = "";

    if (modalContent === "Cold-Email") {
      nodeContent = `- (${subject}) ${text}`;
    } else if (modalContent === "Wait/Delay") {
      nodeContent = `- (${delay})`;
    } else {
      nodeContent = `- (${email})`;
    }

    if (editingNode) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === editingNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  label: `${modalContent}\n${nodeContent}`,
                  nodeType: modalContent,
                },
                style: {
                  ...node.style,
                  ...getNodeStyle(modalContent),
                },
              }
            : node
        )
      );
      showNotification("Node updated successfully");
    } else {
      if (nodes.length === 0 && selectedNodeType !== "Lead-Source") {
        setSelectedNodeType("Lead-Source");
        addNode("Lead-Source", `- (${email || "example@email.com"})`);
      } else {
        addNode(modalContent, nodeContent);
        showNotification("Node added successfully");
      }
    }

    setIsOpen(false);
    setIsSubmitting(false);
  };

  const reconnectEdges = (nodeId) => {
    const incomingEdge = edges.find((edge) => edge.target === nodeId);
    const outgoingEdge = edges.find((edge) => edge.source === nodeId);

    if (incomingEdge && outgoingEdge) {
      const newEdge = {
        id: `e${incomingEdge.source}-${outgoingEdge.target}`,
        source: incomingEdge.source,
        target: outgoingEdge.target,
        animated: true,
        style: { stroke: "#64748b", strokeWidth: 2 },
      };
      return edges
        .filter(
          (edge) => edge.id !== incomingEdge.id && edge.id !== outgoingEdge.id
        )
        .concat(newEdge);
    }
    return edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId
    );
  };

  const deleteNode = () => {
    if (!editingNode) return;

    // Store the ID before we close the modal
    const nodeIdToDelete = editingNode.id;

    // Update edges to reconnect the flow
    const updatedEdges = reconnectEdges(nodeIdToDelete);
    setEdges(updatedEdges);

    // Remove the node
    setNodes((nds) => nds.filter((node) => node.id !== nodeIdToDelete));

    setIsOpen(false);
    showNotification("Node deleted successfully");
  };

  const renderModalContent = () => {
    const IconComponent = nodeTypes[modalContent];

    return (
      <div className="text-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {IconComponent && <IconComponent className="mr-2" size={20} />}
            <h2 className="text-xl font-semibold">
              {editingNode ? `Edit ${modalContent}` : `Add ${modalContent}`}
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {modalContent === "Cold-Email" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium mb-1"
              >
                Subject:
              </label>
              <input
                type="text"
                name="subject"
                id="subject"
                defaultValue={
                  editingNode?.data.label.split("- (")[1]?.split(")")[0] || ""
                }
                required
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium mb-1"
              >
                Email Content:
              </label>
              <textarea
                name="content"
                id="content"
                rows="4"
                defaultValue={editingNode?.data.label.split(") ")[1] || ""}
                required
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 mt-4">
              {editingNode && (
                <button
                  type="button"
                  onClick={deleteNode}
                  className="flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  <Trash2 size={16} className="mr-1" />
                  Delete
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center ml-auto px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                <Save size={16} className="mr-1" />
                {isSubmitting ? "Saving..." : editingNode ? "Update" : "Add"}
              </button>
            </div>
          </form>
        )}

        {modalContent === "Wait/Delay" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label htmlFor="delay" className="block text-sm font-medium mb-1">
                Wait Duration:
              </label>
              <select
                name="delay"
                id="delay"
                defaultValue={
                  editingNode?.data.label.split("- (")[1]?.split(")")[0] ||
                  "1 min"
                }
                required
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {[...Array(10).keys()].map((i) => (
                  <option key={i} value={`${i + 1} min`}>
                    {i + 1} {i === 0 ? "minute" : "minutes"}
                  </option>
                ))}
                <option value="60 min">1 hour</option>
                <option value="120 min">2 hours</option>
                <option value="1440 min">1 day</option>
                <option value="2880 min">2 days</option>
                <option value="4320 min">3 days</option>
              </select>
            </div>

            <div className="flex gap-2 mt-4">
              {editingNode && (
                <button
                  type="button"
                  onClick={deleteNode}
                  className="flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  <Trash2 size={16} className="mr-1" />
                  Delete
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center ml-auto px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                <Save size={16} className="mr-1" />
                {isSubmitting ? "Saving..." : editingNode ? "Update" : "Add"}
              </button>
            </div>
          </form>
        )}

        {modalContent === "Lead-Source" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Recipient Email:
              </label>
              <input
                type="email"
                name="email"
                id="email"
                defaultValue={
                  editingNode?.data.label.split("- (")[1]?.split(")")[0] || ""
                }
                required
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 mt-4">
              {editingNode && nodes.length > 1 && (
                <button
                  type="button"
                  onClick={deleteNode}
                  className="flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  <Trash2 size={16} className="mr-1" />
                  Delete
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center ml-auto px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                <Save size={16} className="mr-1" />
                {isSubmitting ? "Saving..." : editingNode ? "Update" : "Add"}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

  const handleNodeClick = (event, node) => {
    const nodeType = node.data.label.split("\n")[0];
    setModalContent(nodeType);
    setIsOpen(true);
    setEditingNode(node);
  };

  const handleStartProcess = async () => {
    try {
      setIsSubmitting(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/sequence/start-process`,
        {
          nodes,
          edges,
        }
      );
      if (response.status === 200) {
        showNotification("Process started successfully");
      } else {
        showNotification("Error starting process", "error");
      }
    } catch (error) {
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (nodes.length === 0) {
      handleAddNode();
    }
  }, []);

  return (
    <div className="w-[100vw] h-full flex flex-col">
      <div className="relative w-full h-[70vh] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden shadow-md">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
        >
          <Controls className="bg-white shadow-md rounded-md" />
          <Background color="#aaa" variant="dots" />

          <Panel
            position="top-left"
            className="bg-white p-3 rounded-md shadow-md"
          >
            <h3 className="font-semibold mb-2 text-gray-700">
              Email Sequence Flow
            </h3>
            <div className="text-xs text-gray-500">Click on nodes to edit</div>
          </Panel>
        </ReactFlow>

        {notification && (
          <div
            className={`absolute top-4 right-4 flex items-center p-3 rounded-md shadow-md ${
              notification.type === "error"
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {notification.type === "error" ? (
              <AlertCircle className="mr-2" size={18} />
            ) : (
              <MessageSquare className="mr-2" size={18} />
            )}
            {notification.message}
          </div>
        )}
      </div>

      <div className="w-full p-4 bg-white rounded-lg shadow-md mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center">
          <label htmlFor="nodeType" className="mr-2 text-gray-700 font-medium">
            Node Type:
          </label>
          <select
            id="nodeType"
            value={selectedNodeType}
            onChange={(e) => setSelectedNodeType(e.target.value)}
            className="border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Cold-Email">Cold Email</option>
            <option value="Wait/Delay">Wait/Delay</option>
            <option value="Lead-Source">Lead Source</option>
          </select>
        </div>

        <button
          onClick={handleAddNode}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          <Plus size={18} className="mr-1" />
          Add Node
        </button>

        <button
          onClick={handleStartProcess}
          disabled={isSubmitting || nodes.length === 0}
          className={`flex items-center px-4 py-2 rounded-md ml-auto ${
            isSubmitting || nodes.length === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-green-500 text-white hover:bg-green-600"
          }`}
        >
          <Play size={18} className="mr-1" />
          {isSubmitting ? "Starting..." : "Start Process"}
        </button>
      </div>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => !isSubmitting && setIsOpen(false)}
        style={customStyles}
        contentLabel="Node Configuration"
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
}

export default FlowChart;
