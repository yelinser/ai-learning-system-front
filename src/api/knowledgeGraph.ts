// src/api/knowledgeGraph.ts
// ✅ 修复版 - 字段名与后端匹配 (start_node_id, end_node_id, type)
import request from '@/utils/request';

/* --------------------------------------------------
 * 通用包装
 * -------------------------------------------------- */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

/* --------------------------------------------------
 * Neo4j 原始数据格式(后端返回)
 * -------------------------------------------------- */
interface Neo4jNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

// ✅ 修正：匹配后端实际字段名
interface Neo4jRelationship {
  id?: string;
  start_node_id?: string;  // ✅ 改为 start_node_id
  end_node_id?: string;     // ✅ 改为 end_node_id
  type?: string;            // ✅ 改为 type
  properties?: Record<string, any>;
}

interface Neo4jGraphData {
  nodes: Neo4jNode[];
  relationships: Neo4jRelationship[];
}

/* --------------------------------------------------
 * 前端使用的标准格式
 * -------------------------------------------------- */
export interface GraphNode {
  id: string;
  name: string;          
  category: 'chapter' | 'concept' | 'resource';
  status: 'mastered' | 'learning' | 'unlearned';
  progress?: number;     
  chapter?: string;      
  description?: string;
  relatedResources?: Resource[];
  prerequisites?: { id: string; name: string }[];
  suggestions?: string[];
  symbolSize?: number;
  itemStyle?: any;
  label?: any;
  filename?: string;
  resource_type?: string;
  file_path?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  label?: string;
  lineStyle?: any;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[]; 
}

/* --------------------------------------------------
 * 转换函数(修复版)
 * -------------------------------------------------- */
const convertNeo4jNode = (neoNode: Neo4jNode, index: number): GraphNode | null => {
  const props = neoNode.properties || {};
  const labels = neoNode.labels || [];
  
  const validLabels = ['Resource', 'Concept', 'Chapter'];
  const primaryLabel = labels.find(l => validLabels.includes(l));
  
  if (!primaryLabel) return null;
  
  let name: string;
  if (primaryLabel === 'Resource') {
    name = props.title || props.filename || props.name || '未命名资源';
  } else {
    name = props.name || '未命名概念';
  }
  
  if (!name || name.trim() === '') {
    const idParts = neoNode.id.split(':');
    name = idParts[idParts.length - 1] || '未命名';
  }
  
  const category = primaryLabel.toLowerCase() as 'resource' | 'concept' | 'chapter';
  
  const statusStyleMap = {
    mastered: { color: '#67c23a', size: 50 },
    learning: { color: '#e6a23c', size: 40 },
    unlearned: { color: '#909399', size: 35 }
  };
  
  const status = (props.status || 'unlearned') as 'mastered' | 'learning' | 'unlearned';
  const style = statusStyleMap[status];
  
  return {
    id: neoNode.id,
    name,
    category,
    status,
    progress: props.progress,
    chapter: props.chapter,
    description: props.description,
    symbolSize: style.size,
    itemStyle: { color: style.color },
    label: { show: true, fontSize: 12 },
    ...(primaryLabel === 'Resource' && {
      filename: props.filename,
      resource_type: props.resource_type,
      file_path: props.file_path
    })
  };
};

const convertNeo4jRelationship = (
  neoRel: Neo4jRelationship, 
  nameToIdMap: Map<string, string>,
  index: number
): GraphLink | null => {
  // ✅ 使用实际字段名
  const startNode = neoRel.start_node_id ?? '';
  const endNode = neoRel.end_node_id ?? '';
  const relType = neoRel.type ?? '';

  console.log(`[关系#${index}] 开始转换: start="${startNode}", end="${endNode}", type="${relType}"`);

  // ✅ 严格校验：任一字段为空就跳过
  if (!startNode || !endNode || startNode === '' || endNode === '') {
    console.warn(`[关系#${index}] ❌ start或end为空，跳过`);
    return null;
  }

  // ✅ 关键：过滤无类型的关系
  if (!relType || relType.trim() === '') {
    console.warn(`[关系#${index}] ❌ 关系类型为空/UNDEFINED，跳过`);
    return null;
  }

  const isNeo4jId = (value: string) => /^[0-9]+:/.test(value);
  
  const sourceId = isNeo4jId(startNode) 
    ? startNode 
    : nameToIdMap.get(startNode);
    
  const targetId = isNeo4jId(endNode)
    ? endNode
    : nameToIdMap.get(endNode);
  
  if (!sourceId) {
    console.error(`[关系#${index}] ❌ 找不到start节点: "${startNode}"`);
  }
  if (!targetId) {
    console.error(`[关系#${index}] ❌ 找不到end节点: "${endNode}"`);
  }
  
  if (!sourceId || !targetId) {
    return null;
  }
  
  const relationshipStyles: Record<string, any> = {
    'HAS_KEYWORD': { color: '#67c23a', width: 2, type: 'dashed' },
    'DEPENDS_ON': { color: '#409eff', width: 2, type: 'solid' },
    'INCLUDES': { color: '#e6a23c', width: 2, type: 'solid' },
    'CONTRASTS_WITH': { color: '#f56c6c', width: 2, type: 'dotted' },
    'default': { color: '#909399', width: 1, type: 'solid' }
  };
  
  const style = relationshipStyles[relType] || relationshipStyles.default;
  
  const link = {
    source: sourceId,
    target: targetId,
    label: relType,
    lineStyle: {
      color: style.color,
      width: style.width,
      type: style.type,
      curveness: 0.2
    }
  };
  
  console.log(`[关系#${index}] ✅ 转换成功: ${startNode} -> ${endNode}`);
  return link;
};

/* --------------------------------------------------
 * API 函数(修复版)
 * -------------------------------------------------- */
export const getGraphData = (): Promise<GraphData> => {
  console.group('🔍 知识图谱数据获取');
  
  return request<Neo4jGraphData>({ url: '/knowledge-graph/graph-data', method: 'get' })
    .then((response: any) => {
      console.log('📦 后端原始响应:', response);
      
      const nodes = response?.nodes || [];
      const relationships = response?.relationships || [];
      
      console.log(`📊 数据概览: ${nodes.length} 节点, ${relationships.length} 关系`);
      console.log('🔍 前5条关系预览:', relationships.slice(0, 5));
      
      // ✅ 转换节点
      console.group('节点转换');
      const graphNodes = nodes
        .map((node, index) => convertNeo4jNode(node, index))
        .filter((node): node is GraphNode => node !== null);
      console.log(`✅ 节点转换完成: ${graphNodes.length} 个`);
      console.groupEnd();
      
      // ✅ 构建映射
      console.group('名称映射表');
      const nameToIdMap = new Map<string, string>();
      graphNodes.forEach(node => {
        nameToIdMap.set(node.name, node.id);
        if (node.filename) nameToIdMap.set(node.filename, node.id);
        const originalNode = nodes.find(n => n.id === node.id);
        if (originalNode?.properties?.title) {
          nameToIdMap.set(originalNode.properties.title, node.id);
        }
      });
      console.log(`✅ 映射表: ${nameToIdMap.size} 条记录`);
      console.groupEnd();
      
      // ✅ 转换关系
      console.group('关系转换');
      const links = relationships
        .map((rel, index) => {
          console.log(`\n[关系#${index}] 开始处理`);
          return convertNeo4jRelationship(rel, nameToIdMap, index);
        })
        .filter((link): link is GraphLink => link !== null);
      console.log(`✅ 关系转换完成: ${links.length} 条有效连接`);
      console.groupEnd();
      
      console.groupEnd();
      return { nodes: graphNodes, links };
    })
    .catch(error => {
      console.error('❌ 请求失败:', error);
      console.groupEnd();
      return { nodes: [], links: [] };
    });
};

/* --------------------------------------------------
 * 2. 概念 CRUD
 * -------------------------------------------------- */
export interface Concept {
  id: string;
  name: string;
  description?: string;
}

export const getAllConcepts = () =>
  request<Concept[]>({ url: '/knowledge-graph/concepts', method: 'get' }).then(res => res.data);

export interface AddConceptDTO {
  name: string;
  description?: string;
}
export const addConcept = (dto: AddConceptDTO) =>
  request<ApiResponse>({ url: '/knowledge-graph/concepts', method: 'post', data: dto });

export const deleteConcept = (conceptName: string) =>
  request<ApiResponse>({ url: `/knowledge-graph/concepts/${conceptName}`, method: 'delete' });

/* --------------------------------------------------
 * 3. 关系 CRUD
 * -------------------------------------------------- */
export interface Relationship {
  id: string;
  source: string;
  target: string;
  relationType: string;
}
export const getAllRelationships = () =>
  request<Relationship[]>({ url: '/knowledge-graph/relationships', method: 'get' }).then(res => res.data);

export interface AddRelationshipDTO {
  source: string;
  target: string;
  relationType: string;
}
export const addRelationship = (dto: AddRelationshipDTO) =>
  request<ApiResponse>({ url: '/knowledge-graph/relationships', method: 'post', data: dto });

/* --------------------------------------------------
 * 4. 学生 & 学习记录
 * -------------------------------------------------- */
export interface Student {
  id: string;
  name: string;
}
export const getAllStudents = () =>
  request<Student[]>({ url: '/knowledge-graph/students', method: 'get' }).then(res => res.data);

export interface AddStudentDTO {
  name: string;
}
export const addStudent = (dto: AddStudentDTO) =>
  request<ApiResponse>({ url: '/knowledge-graph/students', method: 'post', data: dto });

export interface LearningRecord {
  id: string;
  studentId: string;
  conceptId: string;
  status: 'not_started' | 'learning' | 'completed';
}
export interface AddLearningRecordDTO {
  studentId: string;
  conceptId: string;
  status: LearningRecord['status'];
}
export const addLearningRecord = (dto: AddLearningRecordDTO) =>
  request<ApiResponse>({ url: '/knowledge-graph/learning-records', method: 'post', data: dto });

/* --------------------------------------------------
 * 5. 学习进度 & 路径 & 资源推荐
 * -------------------------------------------------- */
export interface LearningProgress {
  studentId: string;
  completedConcepts: string[];
  inProgressConcepts: string[];
}
export const getStudentLearningProgress = (studentId: string) =>
  request<LearningProgress>({ url: `/knowledge-graph/students/${studentId}/learning-progress`, method: 'get' })
    .then(res => res.data);

export const recommendLearningPath = (studentId: string) =>
  request<Concept[]>({ url: `/knowledge-graph/students/${studentId}/learning-path`, method: 'get' })
    .then(res => res.data);

/* --------------------------------------------------
 * 6. 资源 Resource
 * -------------------------------------------------- */
export interface Resource {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  resource_type: string;
  metadata: Record<string, any>;
  upload_time: string;
  file_path: string;
  vector_id: string | null;
}

export const recommendResourcesForConcept = (conceptName: string) =>
  request<Resource[]>({ url: `/knowledge-graph/concepts/${conceptName}/resources`, method: 'get' })
    .then(res => res.data);

export interface UploadResourceDTO {
  conceptId?: string;
  resource_type: string;
  metadata?: Record<string, any>;
}
export const uploadResource = (formData: FormData) =>
  request<{ resource: Resource }>({
    url: '/api/v1/resources/upload',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data);

export const downloadResource = (resourceId: string) =>
  request<Blob>({
    url: `/api/v1/resources/${resourceId}/download`,
    method: 'get',
    responseType: 'blob'
  }).then(res => new Blob([res.data]));

export const deleteResource = (resourceId: string) =>
  request<ApiResponse>({ url: `/api/v1/resources/${resourceId}`, method: 'delete' });

/* --------------------------------------------------
 * 7. 可视化 & 管理
 * -------------------------------------------------- */
export const getLearningPathVisualization = (studentId: string) =>
  request<GraphData>({ url: `/knowledge-graph/students/${studentId}/learning-path-visualization`, method: 'get' })
    .then(res => res.data);

export const deleteNode = (nodeId: string) =>
  request<ApiResponse>({ url: `/knowledge-graph/nodes/${nodeId}`, method: 'delete' });