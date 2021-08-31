import React, {useState, useEffect, useContext, useLayoutEffect, CSSProperties} from "react";
import Graph from "react-graph-vis";
import "./graph-vis.scss";
import {ModelingContext} from "../../../../util/modeling-context";
import ReactDOMServer from "react-dom/server";
import {faFileExport} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import NodeSvg from "./node-svg";
import graphConfig from "../../../../config/graph-vis.config";
import AddEditRelationship from "../relationship-modal/add-edit-relationship";
import {Dropdown, Menu} from "antd";

type Props = {
  entityTypes: any;
  handleEntitySelection: any;
  filteredEntityTypes: any;
  entitySelected: any;
  isEntitySelected: boolean;
  updateSavedEntity: any;
  toggleRelationshipModal: any;
  relationshipModalVisible: any;
  canReadEntityModel: any;
  canWriteEntityModel: any;
  saveEntityCoords: any;
};

let entityMetadata = {};
// TODO temp hardcoded node data, remove when retrieved from db
// entityMetadata = graphConfig.sampleMetadata;

const GraphVis: React.FC<Props> = (props) => {

  const graphType = "shape";

  const {modelingOptions, setSelectedEntity} = useContext(ModelingContext);
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  //const [physicsEnabled, setPhysicsEnabled] = useState(false);
  const [graphData, setGraphData] = useState({nodes: [], edges: []});
  let testingMode = true; // Should be used further to handle testing only in non-production environment
  const [openRelationshipModal, setOpenRelationshipModal] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<any>({});
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [clickedNode, setClickedNode] = useState(undefined);
  const [menuPosition, setMenuPosition] = useState({});
  //const [saveAllCoords, setSaveAllCoords] = useState(false);
  const [coordsLoaded, setCoordsLoaded] = useState(false);
  const [coords, setCoords] = useState<any>({});

  // Get network instance on init
  const [network, setNetwork] = useState<any>(null);
  const initNetworkInstance = (networkInstance) => {
    setNetwork(networkInstance);
  };
  const vis = require("vis-network/standalone/umd/vis-network"); //eslint-disable-line @typescript-eslint/no-unused-vars

  // Load coords on init
  useEffect(() => {
    if (!coordsLoaded && props.entityTypes.length > 0) {
      let newCoords = {};
      props.entityTypes.forEach(e => {
        if (e.model.hubCentral) {
          let opts = e.model.hubCentral.modeling;
          if (opts.graphX && opts.graphY) {
            newCoords[e.entityName] = {graphX: opts.graphX, graphY: opts.graphY};
          }
        }
      });
      setCoords(newCoords);
      setCoordsLoaded(true);
    }
  }, [props.entityTypes]);

  // Initialize or update graph
  useEffect(() => {
    if (props.entityTypes) { // && coordsLoaded) {
      let counter = 0;
      props.entityTypes.forEach(e => {
        counter++;
        if (e.model.hubCentral) {
          let opts = e.model.hubCentral.modeling;
          if (opts.graphX && opts.graphY) {
            if(physicsEnabled){
              setPhysicsEnabled(false);
              // if(counter === props.entityTypes.length) {
              //   setGraphData({
              //     nodes: getNodes(),
              //     edges: getEdges()
              //   });
              // }
              return false;
            }
          }
        }
      })

      setGraphData({
        nodes: getNodes(),
        edges: getEdges()
      });
      
      //setSaveAllCoords(true);
      return () => {
        setClickedNode(undefined);
        setMenuPosition({});
        setContextMenuVisible(false);
      };
    }
  }, [props.entityTypes, props.filteredEntityTypes.length, coordsLoaded]);

  const coordsExist = (entityName) => {
    let result = false;
    const index = props.entityTypes.map(e => e.entityName).indexOf(entityName);
    if (index >= 0 && props.entityTypes[index].model.hubCentral) {
      if (props.entityTypes[index].model.hubCentral.modeling.graphX && 
          props.entityTypes[index].model.hubCentral.modeling.graphY) {
            result = true;
      }
    }
    return result;
  }

  const saveUnsavedCoords = () => {
    // TODO use endpoint that saves entire updated model at once
    if (props.entityTypes) {
      props.entityTypes.forEach(ent => {
        if (!coordsExist(ent.entityName)) {
          let positions = network.getPositions([ent.entityName])[ent.entityName];
          let newCoords = {...coords, graphX: positions.x, graphY: positions.y};
          setCoords(newCoords);
          props.saveEntityCoords(ent.entityName, positions.x, positions.y);
        }
      })
    }
  };

  // Save all unsaved coords
  // useEffect(() => {
  //   if (saveAllCoords && network) {
  //     saveUnsavedCoords();
  //   }
  //   setSaveAllCoords(false);
  // }, [saveAllCoords]);

  // Focus on the selected nodes in filter input
  useEffect(() => {
    if (network) {
      network.focus(props.entitySelected);
    }
  }, [network, props.isEntitySelected]);

  // React to node selection from outside (e.g. new node created)
  useEffect(() => {
    if (network && modelingOptions.selectedEntity) {
      // Ensure entity exists
      if (props.entityTypes.some(e => e.entityName === modelingOptions.selectedEntity)) {
        // Persist selection and coords
        network.selectNodes([modelingOptions.selectedEntity]);
        saveUnsavedCoords();
      } else {
        // Entity type not found, unset in context
        setSelectedEntity(undefined);
      }
    }
  }, [network, modelingOptions.selectedEntity]);

  useLayoutEffect(() => {
    if (testingMode && network) {
      window.graphVisApi = {
        getNodePositions: (nodeIds?: any) => { return !nodeIds ? network.getPositions() : network.getPositions(nodeIds); },
        canvasToDOM: (xCoordinate, yCoordinate) => { return network.canvasToDOM({x: xCoordinate, y: yCoordinate}); },
      };
    }
  }, [network]);

  // TODO update when icons are implemented
  const getIcon = (entityName) => {
    let icon = <FontAwesomeIcon icon={faFileExport} aria-label="node-icon" />;
    return ReactDOMServer.renderToString(icon);
  };

  // TODO remove when color is retrieved from db
  const getColor = (entityName) => {
    let color = "#cfe3e8";
    if (entityMetadata[entityName] && entityMetadata[entityName].color && props.filteredEntityTypes.length > 0 && !props.filteredEntityTypes.includes("a")) {
      if (props.filteredEntityTypes.includes(entityName)) {
        color = entityMetadata[entityName].color;
      } else {
        color = "#F5F5F5";
      }
    } else if (entityMetadata[entityName] && entityMetadata[entityName].color) {
      color = entityMetadata[entityName].color;
    }
    return color;
  };

  // TODO remove when num instances is retrieved from db
  const getNumInstances = (entityName) => {
    let num = -123;
    if (entityMetadata[entityName] && entityMetadata[entityName].instances) {
      num = entityMetadata[entityName].instances;
    }
    return num;
  };

  const getNodes = () => {
    let nodes;
    if (graphType === "shape") {
      nodes = props.entityTypes && props.entityTypes?.map((e) => {
        let label = "";
        let tmp = {
          ...graphConfig.defaultNodeProps,
          id: e.entityName,
          label: label.concat(
            "<b>", e.entityName, "</b>\n",
            "<code>", getNumInstances(e.entityName).toString(), "</code>"
          ),
          title: e.entityName + " tooltip text", // TODO use entity description
          color: {
            background: getColor(e.entityName),
            border: e.entityName === modelingOptions.selectedEntity && props.entitySelected ? graphConfig.nodeStyles.selectColor : getColor(e.entityName),
          },
          borderWidth: e.entityName === modelingOptions.selectedEntity && props.entitySelected ? 3 : 0,
          // physics: {
          //   enabled: true
          // },
          chosen: {
            node: function (values, id, selected, hovering) {
              if (selected && hovering) {
                values.color = graphConfig.nodeStyles.hoverColor;
                values.borderColor = graphConfig.nodeStyles.selectColor;
                values.borderWidth = 3;
              } else if (selected) {
                values.color = getColor(id);
                values.borderColor = graphConfig.nodeStyles.selectColor;
                values.borderWidth = 3;
              } else if (hovering) {
                values.color = graphConfig.nodeStyles.hoverColor;
                values.borderWidth = 0;
              }
            }
          },        
        };
        if (coords[e.entityName] && coords[e.entityName].graphX && coords[e.entityName].graphY) {
          //tmp.physics.enabled = false;
          tmp.x = coords[e.entityName].graphX;
          tmp.y = coords[e.entityName].graphY;
        }
        return tmp;
      });
    } else if (graphType === "image") { // TODO for custom SVG node, not currently used
      nodes = props.entityTypes && props.entityTypes?.map((e) => {
        const node = new NodeSvg(e.entityName, getColor(e.entityName), getNumInstances(e.entityName), getIcon(e.entityName));
        return {
          id: e.entityName,
          label: "",
          title: e.entityName + " tooltip text",
          image: "data:image/svg+xml;charset=utf-8," + node.getSvg(),
          shape: "image"
        };
      });
    }
    return nodes;
  };

  const onChosen = (values, id, selected, hovering) => {
    values.color = "#7FADE3";

    //change one to many image
    if (values.arrowStrikethrough === false) {
      values.toArrowSrc = graphConfig.customEdgeSVG.oneToManyHover;
    } else {
    //change one to one image
      values.toArrowSrc = graphConfig.customEdgeSVG.oneToOneHover;
    }
  };

  const getEdges = () => {
    let edges: any = [];
    props.entityTypes.forEach((e, i) => {
      let properties: any = Object.keys(e.model.definitions[e.entityName].properties);
      properties.forEach((p, i) => {
        let pObj = e.model.definitions[e.entityName].properties[p];
        //for one to one edges
        if (pObj.relatedEntityType) {
          let parts = pObj.relatedEntityType.split("/");
          edges.push({
            ...graphConfig.defaultEdgeProps,
            from: e.entityName,
            to: parts[parts.length - 1],
            label: p,
            id: p + "-" + pObj.joinPropertyName + "-edge",
            title: "Edit Relationship",
            arrows: {
              to: {
                enabled: true,
                src: graphConfig.customEdgeSVG.oneToOne,
                type: "image"
              }
            },
            endPointOffset: {
              from: -500,
              to: -500
            },
            arrowStrikethrough: true,
            color: "#666",
            font: {
              align: "top",
            },
            chosen: {
              label: onChosen,
              edge: onChosen,
              node: false
            }
          });
        //for one to many edges
        } else if (pObj.items?.relatedEntityType) {
          let parts = pObj.items.relatedEntityType.split("/");
          edges.push({
            ...graphConfig.defaultEdgeProps,
            from: e.entityName,
            to: parts[parts.length - 1],
            label: p,
            id: p + "-" + pObj.items.joinPropertyName + "-edge",
            title: "Edit Relationship",
            arrowStrikethrough: false,
            arrows: {
              to: {
                enabled: true,
                src: graphConfig.customEdgeSVG.oneToMany,
                type: "image"
              }
            },
            color: "#666",
            font: {align: "top"},
            chosen: {
              label: onChosen,
              edge: onChosen,
              node: false
            }
          });
        }
      });
    });
    return edges;
  };

  const options = {
    ...graphConfig.defaultOptions,
    layout: {
      //hierarchical: true
      //randomSeed: "0.7696:1625099255200",
    },
    physics: {
      enabled: physicsEnabled,
      barnesHut: {
        springLength: 160,
        avoidOverlap: 0.4
      },
      stabilization: {
        enabled: false,
        //iterations: 300,
      }
    },
    interaction: {
      navigationButtons: true,
      hover: true,
    },
    manipulation: {
      enabled: false,
      addNode: function (data, callback) {
        // filling in the popup DOM elements
      },
      editNode: function (data, callback) {
        // filling in the popup DOM elements
      },
      addEdge: function (data, callback) {
        // filling in the popup DOM elements
      }
    }
  };

  const menuClick = (event) => {
    // TODO do something useful
    setContextMenuVisible(false);
    if (event.key === "1") {
      if (network) {
        network.focus(clickedNode);
        setClickedNode(undefined);
      }
    }
  };

  const contextMenu: CSSProperties = {
    top: menuPosition["top"],
    left: menuPosition["left"]
  };

  const menu = () => {
    return (
      <Menu id="contextMenu" style={contextMenu} onClick={menuClick}>
        { clickedNode &&
      <Menu.Item key="1" data-testid={`centerOnEntityType-${clickedNode}`}>
        Center on entity type
      </Menu.Item> }
        {/*{ clickedEdge &&
      <Menu.Item key="2">
        {"Edit relationship "}
      </Menu.Item> }
        <Menu.Item key="3"> <Link to={{ pathname: "/tiles/explore", state: {entity: clickedNode}}}>
          {"Explore " + clickedNode + " instances"}
        </Link> </Menu.Item>
      <Menu.Item key="4">3rd menu item</Menu.Item>*/}
      </Menu>
    );
  };

  useEffect(() => {
    if (clickedNode && menuPosition) {
      setContextMenuVisible(true);
    } else {
      setContextMenuVisible(false);
    }
  }, [clickedNode]);

  const events = {
    select: (event) => {
      let {nodes} = event;
      if (nodes.length > 0) {
        props.handleEntitySelection(nodes[0]);
      }
    },
    click: (event) => {
      //if click is on an edge
      if (event.edges.length > 0 && event.nodes.length < 1) {
        let connectedNodes = network.getConnectedNodes(event.edges[0]);
        let sourceNodeName = connectedNodes[0];
        let targetNodeName = connectedNodes[1];
        let relationshipInfo = {
          edgeId: event.edges[0],
          sourceNodeName: connectedNodes[0],
          sourceNodeColor: entityMetadata[sourceNodeName] && entityMetadata[sourceNodeName].color ? entityMetadata[sourceNodeName].color : "#cfe3e8",
          targetNodeName: connectedNodes[1],
          targetNodeColor: entityMetadata[targetNodeName] && entityMetadata[targetNodeName].color ? entityMetadata[targetNodeName].color : "#cfe3e8",
          relationshipName: event.edges[0].split("-")[0],
          joinPropertyName: event.edges[0].split("-")[1]
        };
        setSelectedRelationship(relationshipInfo);
        setOpenRelationshipModal(true);
      }
      if (clickedNode) {
        setClickedNode(undefined);
      }
    },

    dragStart: (event) => {
      if (physicsEnabled) {
        setPhysicsEnabled(false);
      }
    },
    dragEnd: (event) => {
      let {nodes} = event;
      if (nodes.length > 0) {
        let positions = network.getPositions([nodes[0]])[nodes[0]];
        if (positions && positions.x && positions.y) {
          let newCoords = {...coords};
          newCoords[nodes[0]] = {graphX: positions.x, graphY: positions.y};
          setCoords(newCoords);
          props.saveEntityCoords(nodes[0], positions.x, positions.y);
        }
      } else {
        // TODO handle dragging entire graph (nodes.length === 0), zooming, nav button clicks
      }
    },
    hoverNode: (event) => {
      event.event.target.style.cursor = "pointer";
    },
    blurNode: (event) => {
      event.event.target.style.cursor = "";
    },
    hoverEdge: (event) => {
      event.event.target.style.cursor = "pointer";
    },
    blurEdge: (event) => {
      event.event.target.style.cursor = "";
    },
    doubleClick: (event) => {
    },
    stabilized: (event) => {
      if (network) {
        let nodePositions = network.getPositions();
        if(nodePositions) {
          saveUnsavedCoords();
        }
        if (modelingOptions.selectedEntity) {
          try { // visjs might not have new entity yet and error
            network.selectNodes([modelingOptions.selectedEntity]);
          } catch(err) { 
            console.error(err);
          }
        }
      }
    },
    oncontext: (event) => {
      let nodeId = network.getNodeAt(event.pointer.DOM);
      if (nodeId) {
        event.event.preventDefault();
        let canvasCoord = network.getPosition(nodeId);
        let DOMCoordinates = network.canvasToDOM({x: canvasCoord.x, y: canvasCoord.y});
        //let DOMCoordinates = event.pointer.DOM;
        setMenuPosition({left: DOMCoordinates.x, top: DOMCoordinates.y + 40});
        setClickedNode(nodeId);
      } else {
        setClickedNode(undefined);
        setMenuPosition({});
      }
    },
    dragging: (event) => {
      if (clickedNode) {
        setClickedNode(undefined);
        setMenuPosition({});
      }
    }
  };


  return (
    <div id="graphVis">
      <Dropdown
        overlay={menu}
        trigger={["contextMenu"]}
        visible={contextMenuVisible}
        //placement="topRight"
      >
        <Graph
          graph={graphData}
          options={options}
          events={events}
          getNetwork={initNetworkInstance}
        />
      </Dropdown>
      <AddEditRelationship
        openRelationshipModal={openRelationshipModal}
        setOpenRelationshipModal={setOpenRelationshipModal}
        isEditing={true}
        relationshipInfo={selectedRelationship}
        entityTypes={props.entityTypes}
        updateSavedEntity={props.updateSavedEntity}
        relationshipModalVisible={props.relationshipModalVisible}
        toggleRelationshipModal={props.toggleRelationshipModal}
        canReadEntityModel={props.canReadEntityModel}
        canWriteEntityModel={props.canWriteEntityModel}
      />
    </div>
  );
};

export default GraphVis;
