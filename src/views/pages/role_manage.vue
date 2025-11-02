<template>
  <div class="role-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">角色权限管理</h1>
      <p class="page-subtitle">管理系统角色和权限分配</p>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        新增角色
      </el-button>
      <el-button @click="refreshData">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
      
      <div class="search-box">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索角色名称..."
          clearable
          prefix-icon="Search"
          style="width: 300px"
          @input="handleSearch"
        />
      </div>
    </div>

    <!-- 角色列表 -->
    <el-card class="role-list-card">
      <template #header>
        <div class="card-header">
          <span>角色列表</span>
          <span class="total-count">共 {{ filteredRoles.length }} 个角色</span>
        </div>
      </template>

      <el-table
        :data="filteredRoles"
        v-loading="loading"
        row-key="id"
        style="width: 100%"
      >
        <el-table-column prop="name" label="角色名称" min-width="120">
          <template #default="{ row }">
            <div class="role-name">
              <el-tag :type="getRoleType(row.level)" effect="light">
                {{ row.name }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="角色描述" min-width="200" show-overflow-tooltip />

        <el-table-column prop="userCount" label="用户数量" width="100" align="center">
          <template #default="{ row }">
            <span class="user-count">{{ row.userCount }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="level" label="角色等级" width="100" align="center">
          <template #default="{ row }">
            <el-rate
              v-model="row.level"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              @change="handleStatusChange(row)"
            />
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editRole(row)">
              编辑
            </el-button>
            <el-button size="small" type="primary" @click="managePermissions(row)">
              权限
            </el-button>
            <el-button size="small" type="danger" @click="deleteRole(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 新增/编辑角色弹窗 -->
    <el-dialog
      v-model="showRoleDialog"
      :title="isEdit ? '编辑角色' : '新增角色'"
      width="500px"
    >
      <el-form
        ref="roleFormRef"
        :model="roleForm"
        :rules="roleRules"
        label-width="80px"
      >
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="请输入角色名称" />
        </el-form-item>

        <el-form-item label="角色描述" prop="description">
          <el-input
            v-model="roleForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述"
          />
        </el-form-item>

        <el-form-item label="角色等级" prop="level">
          <el-rate
            v-model="roleForm.level"
            :max="5"
            show-text
            :texts="['普通', '重要', '高级', '核心', '超级']"
          />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="roleForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showRoleDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRole" :loading="saving">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 权限管理弹窗 -->
    <el-dialog
      v-model="showPermissionDialog"
      title="权限管理"
      width="600px"
    >
      <div class="permission-management">
        <div class="permission-header">
          <h3>角色：{{ currentRole?.name }}</h3>
          <p>为角色分配系统权限</p>
        </div>

        <div class="permission-tree">
          <el-tree
            ref="permissionTreeRef"
            :data="permissionData"
            show-checkbox
            node-key="id"
            :default-expand-all="true"
            :props="treeProps"
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="showPermissionDialog = false">取消</el-button>
        <el-button type="primary" @click="savePermissions" :loading="savingPermissions">
          保存权限
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const savingPermissions = ref(false)
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const showRoleDialog = ref(false)
const showPermissionDialog = ref(false)
const isEdit = ref(false)
const roleFormRef = ref()
const permissionTreeRef = ref()

// 角色数据
const roles = ref([
  {
    id: 1,
    name: '超级管理员',
    description: '系统最高权限管理者，拥有所有权限',
    userCount: 1,
    level: 5,
    status: 1,
    createTime: new Date('2024-01-01')
  },
  {
    id: 2,
    name: '教师',
    description: '课程教师，可以管理课程、学生和教学内容',
    userCount: 15,
    level: 4,
    status: 1,
    createTime: new Date('2024-01-15')
  },
  {
    id: 3,
    name: '学生',
    description: '学习系统的主要使用者',
    userCount: 200,
    level: 3,
    status: 1,
    createTime: new Date('2024-01-20')
  },
  {
    id: 4,
    name: '内容管理员',
    description: '负责课程内容和知识库的管理',
    userCount: 3,
    level: 4,
    status: 1,
    createTime: new Date('2024-02-01')
  },
  {
    id: 5,
    name: '访客',
    description: '仅能浏览公开内容',
    userCount: 50,
    level: 1,
    status: 0,
    createTime: new Date('2024-02-10')
  }
])

// 角色表单
const roleForm = reactive({
  id: '',
  name: '',
  description: '',
  level: 3,
  status: 1
})

// 表单验证规则
const roleRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 20, message: '角色名称长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入角色描述', trigger: 'blur' },
    { min: 5, max: 100, message: '角色描述长度在 5 到 100 个字符', trigger: 'blur' }
  ]
}

// 当前操作的角色
const currentRole = ref(null)

// 权限数据
const permissionData = ref([
  {
    id: 1,
    label: '系统管理',
    children: [
      { id: 101, label: '用户管理' },
      { id: 102, label: '角色管理' },
      { id: 103, label: '系统设置' }
    ]
  },
  {
    id: 2,
    label: '课程管理',
    children: [
      { id: 201, label: '课程创建' },
      { id: 202, label: '课程编辑' },
      { id: 203, label: '课程删除' },
      { id: 204, label: '课程发布' }
    ]
  },
  {
    id: 3,
    label: '内容管理',
    children: [
      { id: 301, label: '知识库管理' },
      { id: 302, label: '资源上传' },
      { id: 303, label: '内容审核' }
    ]
  },
  {
    id: 4,
    label: '学习管理',
    children: [
      { id: 401, label: '学习进度查看' },
      { id: 402, label: '成绩管理' },
      { id: 403, label: '学习分析' }
    ]
  },
  {
    id: 5,
    label: 'AI功能',
    children: [
      { id: 501, label: 'AI助教使用' },
      { id: 502, label: '智能推荐管理' },
      { id: 503, label: '学习路径配置' }
    ]
  }
])

// 树形配置
const treeProps = {
  children: 'children',
  label: 'label'
}

// 计算属性
const filteredRoles = computed(() => {
  let result = roles.value
  
  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(role => 
      role.name.toLowerCase().includes(keyword) ||
      role.description.toLowerCase().includes(keyword)
    )
  }
  
  // 分页
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return result.slice(start, end)
})

// 方法
const getRoleType = (level) => {
  const types = {
    1: 'info',
    2: '',
    3: 'success',
    4: 'warning',
    5: 'danger'
  }
  return types[level] || 'info'
}

const formatTime = (date) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleSearch = () => {
  currentPage.value = 1
  total.value = filteredRoles.value.length
}

const handleSizeChange = (newSize) => {
  pageSize.value = newSize
  currentPage.value = 1
}

const handleCurrentChange = (newPage) => {
  currentPage.value = newPage
}

const handleStatusChange = async (role) => {
  try {
    const action = role.status === 1 ? '启用' : '禁用'
    await ElMessageBox.confirm(
      `确定要${action}角色"${role.name}"吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    ElMessage.success(`角色${action}成功`)
    // 这里应该调用API更新状态
  } catch {
    // 恢复原来的状态
    role.status = role.status === 1 ? 0 : 1
  }
}

const showCreateDialog = () => {
  isEdit.value = false
  Object.assign(roleForm, {
    id: '',
    name: '',
    description: '',
    level: 3,
    status: 1
  })
  showRoleDialog.value = true
}

const editRole = (role) => {
  isEdit.value = true
  Object.assign(roleForm, { ...role })
  showRoleDialog.value = true
}

const saveRole = async () => {
  if (!roleFormRef.value) return
  
  try {
    await roleFormRef.value.validate()
    saving.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (isEdit.value) {
      // 更新角色
      const index = roles.value.findIndex(r => r.id === roleForm.id)
      if (index !== -1) {
        roles.value[index] = { ...roleForm }
      }
      ElMessage.success('角色更新成功')
    } else {
      // 新增角色
      const newRole = {
        ...roleForm,
        id: Date.now(),
        userCount: 0,
        createTime: new Date()
      }
      roles.value.unshift(newRole)
      ElMessage.success('角色创建成功')
    }
    
    showRoleDialog.value = false
  } catch (error) {
    console.error('保存角色失败:', error)
  } finally {
    saving.value = false
  }
}

const managePermissions = (role) => {
  currentRole.value = role
  showPermissionDialog.value = true
  
  // 模拟加载权限数据
  setTimeout(() => {
    if (permissionTreeRef.value) {
      // 这里应该根据角色ID从API获取已分配的权限
      const checkedKeys = getRolePermissions(role.id)
      permissionTreeRef.value.setCheckedKeys(checkedKeys)
    }
  }, 100)
}

const savePermissions = async () => {
  if (!permissionTreeRef.value || !currentRole.value) return
  
  try {
    savingPermissions.value = true
    
    const checkedKeys = permissionTreeRef.value.getCheckedKeys()
    const halfCheckedKeys = permissionTreeRef.value.getHalfCheckedKeys()
    const allCheckedKeys = [...checkedKeys, ...halfCheckedKeys]
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log(`为角色 ${currentRole.value.name} 保存权限:`, allCheckedKeys)
    ElMessage.success('权限保存成功')
    showPermissionDialog.value = false
  } catch (error) {
    console.error('保存权限失败:', error)
    ElMessage.error('保存权限失败')
  } finally {
    savingPermissions.value = false
  }
}

const deleteRole = async (role) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除角色"${role.name}"吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    if (role.userCount > 0) {
      ElMessage.warning('该角色下还有用户，无法删除')
      return
    }
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    roles.value = roles.value.filter(r => r.id !== role.id)
    ElMessage.success('角色删除成功')
  } catch {
    // 用户取消删除
  }
}

const refreshData = () => {
  loading.value = true
  // 模拟刷新数据
  setTimeout(() => {
    loading.value = false
    ElMessage.success('数据已刷新')
  }, 1000)
}

// 模拟获取角色权限
const getRolePermissions = (roleId) => {
  const permissionsMap = {
    1: [1, 101, 102, 103, 2, 201, 202, 203, 204, 3, 301, 302, 303, 4, 401, 402, 403, 5, 501, 502, 503], // 超级管理员所有权限
    2: [2, 201, 202, 204, 3, 301, 302, 4, 401, 402, 5, 501], // 教师权限
    3: [4, 401, 5, 501], // 学生权限
    4: [3, 301, 302, 303], // 内容管理员权限
    5: [] // 访客无权限
  }
  return permissionsMap[roleId] || []
}

// 生命周期
onMounted(() => {
  total.value = roles.value.length
})
</script>

<style scoped>
.role-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  color: #303133;
  font-weight: bold;
}

.page-subtitle {
  margin: 5px 0 0 0;
  color: #606266;
  font-size: 14px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-box {
  display: flex;
  align-items: center;
}

.role-list-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-count {
  color: #909399;
  font-size: 14px;
}

.role-name {
  display: flex;
  align-items: center;
}

.user-count {
  font-weight: bold;
  color: #409eff;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.permission-management {
  padding: 10px 0;
}

.permission-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.permission-header h3 {
  margin: 0 0 5px 0;
  color: #303133;
}

.permission-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.permission-tree {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
}
</style>