// src/api/knowledgeGraph.ts
import request from '@/utils/request';

/* --------------------------------------------------
 * 类型定义
 * -------------------------------------------------- */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

interface Neo4jNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

interface Neo4jRelationship {
  id?: string;
  start_node_id?: string;
  end_node_id?: string;
  type?: string;
  properties?: Record<string, any>;
}

interface Neo4jGraphData {
  nodes: Neo4jNode[];
  relationships: Neo4jRelationship[];
}

export interface GraphNode {
  id: string;
  resourceId?: string;
  name: string;
  category: 'chapter' | 'concept' | 'resource' | 'student' | 'learningrecord';
  status: 'mastered' | 'learning' | 'unlearned';
  progress?: number;
  chapter?: string;
  description?: string;
  relatedResources?: Resource[];
  prerequisites?: { id: string; name: string }[];
  suggestions?: string[];
  symbolSize?: number | number[];
  symbol?: string;
  itemStyle?: any;
  label?: any;
  filename?: string;
  resource_type?: string;
  file_path?: string;
  content_type?: string;
  vector_id?: string;
  isContextNode?: boolean;
  meta?: {
    connectionCount?: number;
    isOnCriticalPath?: boolean;
  };
}

export interface GraphLink {
  source: string;
  target: string;
  label?: string;
  lineStyle?: any;
  id?: string;
  isContextEdge?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/* --------------------------------------------------
 * 辅助函数
 * -------------------------------------------------- */
function getMimeType(ext?: string): string {
  if (!ext) return 'application/octet-stream';
  const mimeMap: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'json': 'application/json',
    'xml': 'application/xml',
    'md': 'text/markdown',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg'
  };
  return mimeMap[ext.toLowerCase()] || 'application/octet-stream';
}

function getSymbolSize(category: string, status?: string): number | number[] {
  const baseSize = { mastered: 50, learning: 40, unlearned: 35 }[status as keyof any] || 35;
  const multiplier = { resource: 0.8, concept: 1.0, chapter: 1.2, student: 0.9, learningrecord: 0.7 }[category] || 1.0;
  const size = Math.round(baseSize * multiplier);
  return category === 'resource' ? [40, 32] : size;
}

function getSymbol(category: string): string {
  return { concept: 'circle', resource: 'rect', chapter: 'triangle', student: 'diamond', learningrecord: 'pin' }[category] || 'circle';
}

function getItemStyle(category: string, status?: string): any {
  const statusColor = { mastered: '#67c23a', learning: '#e6a23c', unlearned: '#909399' }[status as keyof any] || '#909399';
  return { 
    color: statusColor, 
    borderWidth: category === 'resource' ? 2 : 0, 
    borderColor: '#fff' 
  };
}

/* --------------------------------------------------
 * 节点转换函数
 * -------------------------------------------------- */
const convertNeo4jNode = (neoNode: Neo4jNode, index: number): GraphNode | null => {
  const props = neoNode.properties || {};
  const labels = neoNode.labels || [];
  
  const validLabels = ['Resource', 'Concept', 'Chapter', 'Student', 'LearningRecord'];
  const primaryLabel = labels.find(l => validLabels.includes(l));
  if (!primaryLabel) return null;

  let name: string;
  if (primaryLabel === 'Resource') {
    name = props.title || props.filename || props.name || '未命名资源';
    if (props.filename) {
      try {
        props.filename = decodeURIComponent(props.filename);
      } catch (e) {
        console.warn('文件名解码失败:', props.filename);
      }
    }
  } else {
    name = props.name || '未命名概念';
  }

  const category = primaryLabel.toLowerCase() as GraphNode['category'];
  const isResource = category === 'resource';
  
  return {
    id: neoNode.id,
    resourceId: isResource ? props.id : undefined,
    name,
    category,
    status: (props.status as GraphNode['status']) || 'unlearned',
    progress: props.progress,
    chapter: props.chapter,
    description: props.description,
    symbolSize: getSymbolSize(category, props.status),
    symbol: getSymbol(category),
    itemStyle: getItemStyle(category, props.status),
    label: { show: true, fontSize: 12 },
    ...(isResource && {
      filename: props.filename,
      resource_type: props.resource_type,
      content_type: getMimeType(props.resource_type),
      file_path: props.file_path,
      vector_id: props.vector_id
    })
  };
};

/* --------------------------------------------------
 * 关系转换函数
 * -------------------------------------------------- */
const convertNeo4jRelationship = (
  neoRel: Neo4jRelationship, 
  nameToIdMap: Map<string, string>,
  index: number
): GraphLink | null => {
  const startNode = neoRel.start_node_id ?? '';
  const endNode = neoRel.end_node_id ?? '';
  const relType = neoRel.type ?? '';
  const id = neoRel.id ?? '';

  if (!startNode || !endNode || !relType) {
    console.warn(`[关系#${index}] ❌ 数据不完整，跳过`);
    return null;
  }

  const isNeo4jId = (value: string) => /^[0-9]+:/.test(value);
  const sourceId = isNeo4jId(startNode) ? startNode : nameToIdMap.get(startNode);
  const targetId = isNeo4jId(endNode) ? endNode : nameToIdMap.get(endNode);

  if (!sourceId || !targetId) {
    console.error(`[关系#${index}] ❌ 无法解析节点: "${startNode}" -> "${endNode}"`);
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

  return {
    source: sourceId,
    target: targetId,
    label: relType,
    lineStyle: {
      color: style.color,
      width: style.width,
      type: style.type,
      curveness: 0.2
    },
    id: id
  };
};

/* --------------------------------------------------
 * API 主函数
 * -------------------------------------------------- */
export const getGraphData = (): Promise<GraphData> => {
  console.group('🔍 知识图谱数据获取');
  
  return request<Neo4jGraphData>({ url: '/knowledge-graph/graph-data', method: 'get' })
    .then((response: any) => {
      const nodes = response?.nodes || [];
      const relationships = response?.relationships || [];
      
      const graphNodes = nodes
        .map((node, index) => convertNeo4jNode(node, index))
        .filter((node): node is GraphNode => node !== null);

      const nameToIdMap = new Map<string, string>();
      graphNodes.forEach(node => {
        nameToIdMap.set(node.name, node.id);
        if (node.filename) nameToIdMap.set(node.filename, node.id);
        const originalNode = nodes.find(n => n.id === node.id);
        if (originalNode?.properties?.title) {
          nameToIdMap.set(originalNode.properties.title, node.id);
        }
      });

      const links = relationships
        .map((rel, index) => convertNeo4jRelationship(rel, nameToIdMap, index))
        .filter((link): link is GraphLink => link !== null);

      console.groupEnd();
      return { nodes: graphNodes, links };
    })
    .catch(error => {
      console.error('❌ 请求失败:', error);
      console.groupEnd();
      return { nodes: [], links: [] };
    });
};

// =====================================================
// CRUD 接口
// =====================================================
export interface Concept { id: string; name: string; description?: string; }
export const getAllConcepts = () => request<{ concepts: Concept[] }>({ url: '/knowledge-graph/concepts', method: 'get' }).then(res => (res as any).concepts || []).catch(() => []);
export interface AddConceptDTO { name: string; description?: string; }
export const addConcept = (dto: AddConceptDTO) => request<ApiResponse>({ url: '/knowledge-graph/concepts', method: 'post', data: dto });
export const deleteConcept = (conceptName: string) => request<ApiResponse>({ url: `/knowledge-graph/concepts/${conceptName}`, method: 'delete' });

export interface Relationship2 { start_node: string; relationship_type: string; end_node: string; }
export const getAllRelationships = () => request<{ relationships: Relationship2[] }>({ url: '/knowledge-graph/relationships', method: 'get' }).then(res => (res as any).relationships || []);
export interface AddRelationshipDTO { source: string; target: string; relationType: string; }
export const addRelationship = (dto: AddRelationshipDTO) => request<ApiResponse>({ url: '/knowledge-graph/relationships', method: 'post', data: dto });

export interface Student { id: string; name: string; }
export const getAllStudents = () => request<Student[]>({ url: '/knowledge-graph/students', method: 'get' }).then(res => res.data);
export interface AddStudentDTO { name: string; }
export const addStudent = (dto: AddStudentDTO) => request<ApiResponse>({ url: '/knowledge-graph/students', method: 'post', data: dto });

export interface LearningRecord { id: string; studentId: string; conceptId: string; status: 'not_started' | 'learning' | 'completed'; }
export interface AddLearningRecordDTO { studentId: string; conceptId: string; status: LearningRecord['status']; }
export const addLearningRecord = (dto: AddLearningRecordDTO) => request<ApiResponse>({ url: '/knowledge-graph/learning-records', method: 'post', data: dto });

export interface LearningProgress { studentId: string; completedConcepts: string[]; inProgressConcepts: string[]; }
export const getStudentLearningProgress = (studentId: string) => request<LearningProgress>({ url: `/knowledge-graph/students/${studentId}/learning-progress`, method: 'get' }).then(res => res.data);
export const recommendLearningPath = (studentId: string) => request<Concept[]>({ url: `/knowledge-graph/students/${studentId}/learning-path`, method: 'get' }).then(res => res.data);

export interface Resource { id: string; filename: string; content_type: string; size: number; resource_type: string; metadata: Record<string, any>; upload_time: string; file_path: string; vector_id: string | null; }
export const recommendResourcesForConcept = (conceptName: string) => request<Resource[]>({ url: `/knowledge-graph/concepts/${conceptName}/resources`, method: 'get' }).then(res => res.data);
export interface UploadResourceDTO { conceptId?: string; resource_type: string; metadata?: Record<string, any>; }
export const uploadResource = (formData: FormData) => request<{ resource: Resource }>({ url: '/api/v1/resources/upload', method: 'post', data: formData, headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data);

// =====================================================
// ✅ 修复后的下载函数（核心修复：解决TS报错 + 文件名问题）
// =====================================================
export const downloadResource = (resourceId: string): Promise<{ data: Blob; filename: string }> => {
  console.log('📥 下载资源ID:', resourceId);
  
  return request({ 
    url: `/api/v1/resources/${resourceId}/download`, 
    method: 'get', 
    responseType: 'blob' 
  }).then(async (res) => {
    // ✅ 修复：兼容不同的响应结构
    console.log('📄 原始响应对象:', res);
    
    // 有些 request 库返回 {data: Blob, headers: {...}}
    // 有些直接返回 Blob
    const responseBlob = res.data || res;
    const headers = res.headers || {};
    
    console.log('📄 提取的Blob:', responseBlob);
    console.log('📄 提取的Headers:', headers);
    
    if (!responseBlob || typeof responseBlob.size === 'undefined') {
      throw new Error('无效的响应数据: Blob为空或格式错误');
    }
    
    // ✅ 修复TS报错：强制转为字符串
    const contentType = String(headers['content-type'] || '');
    const contentDisposition = String(headers['content-disposition'] || '');
    
    // 检查是否是错误信息
    if (responseBlob.size < 500 && contentType.includes('application/json')) {
      try {
        const text = await responseBlob.text();
        const errorData = JSON.parse(text);
        console.error('❌ 后端返回错误:', errorData);
        throw new Error(errorData.message || errorData.error || '服务器返回错误');
      } catch (e) {
        console.warn('⚠️ 无法解析为JSON，继续作为文件处理');
      }
    }
    
    // ✅ 修复文件名获取：优先用响应头，其次用资源元数据
    let filename = '';
    if (contentDisposition) {
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match) {
        filename = decodeURIComponent(utf8Match[1]);
      } else {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }
    }
    
    // 如果响应头没有文件名，尝试从资源对象本身获取
    if (!filename && (res as any).config?.url) {
      const url = (res as any).config.url;
      const urlMatch = url.match(/\/resources\/(.+?)\/download/);
      if (urlMatch) {
        filename = urlMatch[1]; // 用资源ID作为备用
      }
    }
    
    if (!filename) {
      filename = `resource_${resourceId}`;
      console.warn('⚠️ 无法从响应头获取文件名，使用默认文件名');
    }
    
    console.log('✅ 下载成功:', { 
      filename, 
      size: responseBlob.size, 
      type: responseBlob.type || 'unknown' 
    });
    
    return { 
      data: responseBlob as Blob, 
      filename 
    };
  }).catch(error => {
    console.error('❌ 下载请求失败:', error);
    throw error;
  });
};

export const deleteResource = (resourceId: string) => request<ApiResponse>({ url: `/api/v1/resources/${resourceId}`, method: 'delete' });

export const getLearningPathVisualization = (studentId: string) => request<GraphData>({ url: `/knowledge-graph/students/${studentId}/learning-path-visualization`, method: 'get' }).then(res => res.data);
export const deleteNode = (nodeId: string) => request<ApiResponse>({ url: `/knowledge-graph/nodes/${nodeId}`, method: 'delete' });

// =====================================================
// 智能上下文扩展工具
// =====================================================
class ExpansionCache {
  private cache = new Map<string, Set<string>>();
  private maxSize = 50;

  get(key: string): Set<string> | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: Set<string>): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const expansionCache = new ExpansionCache();

export const expandNodesWithContext = (
  baseNodes: GraphNode[],
  allNodes: GraphNode[],
  allLinks: GraphLink[],
  layers: number
): GraphNode[] => {
  if (layers === 0 || baseNodes.length === 0) {
    return baseNodes;
  }

  const cacheKey = `${baseNodes.map(n => n.id).sort().join(',')}|${layers}`;
  const cached = expansionCache.get(cacheKey);
  
  if (cached) {
    console.log('🎯 命中扩展缓存:', cacheKey);
    return allNodes.filter(n => cached.has(n.id));
  }

  console.log('🔍 执行BFS扩展, 层数:', layers, '基础节点:', baseNodes.length);
  
  const resultIds = new Set<string>(baseNodes.map(n => n.id));
  const queue: Array<{id: string, depth: number}> = [];
  
  baseNodes.forEach(n => queue.push({ id: n.id, depth: 0 }));
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= layers) continue;
    
    allLinks.forEach(link => {
      let neighborId: string | null = null;
      
      if (link.source === current.id) {
        neighborId = link.target as string;
      } else if (link.target === current.id) {
        neighborId = link.source as string;
      }
      
      if (neighborId && !resultIds.has(neighborId)) {
        resultIds.add(neighborId);
        queue.push({ id: neighborId, depth: current.depth + 1 });
      }
    });
  }
  
  expansionCache.set(cacheKey, resultIds);
  
  const resultNodes = allNodes.filter(n => resultIds.has(n.id));
  console.log(`✅ 扩展完成: ${baseNodes.length} -> ${resultNodes.length} 节点`);
  
  return resultNodes;
};

// ✅ 导出getMimeType供Vue组件使用
export { getMimeType };