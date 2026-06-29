<template>
  <el-dialog
    :model-value="visible"
    :title="forceChange ? '修改密码' : '修改密码'"
    width="420px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @update:model-value="$emit('update:visible', $event)"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="原密码" prop="old_password">
        <el-input v-model="form.old_password" type="password" show-password placeholder="请输入原密码" />
      </el-form-item>
      <el-form-item label="新密码" prop="new_password">
        <el-input v-model="form.new_password" type="password" show-password placeholder="请输入新密码" />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirm_password">
        <el-input v-model="form.confirm_password" type="password" show-password placeholder="请再次输入新密码" />
      </el-form-item>
      <div v-if="forceChange" class="force-tip">
        <el-alert type="warning" :closable="false">
          为保障账号安全，您必须修改密码后才能继续使用系统
        </el-alert>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { changePassword } from '@/api/auth'

const props = defineProps<{
  visible: boolean
  forceChange?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'close': []
  'success': []
}>()

const formRef = ref()
const loading = ref(false)

const form = reactive({
  old_password: '',
  new_password: '',
  confirm_password: '',
})

const validateConfirm = (rule: any, value: string, callback: any) => {
  if (value !== form.new_password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  old_password: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  confirm_password: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' },
  ],
}

watch(() => props.visible, (val) => {
  if (val) {
    form.old_password = ''
    form.new_password = ''
    form.confirm_password = ''
  }
})

function handleClose() {
  emit('update:visible', false)
  emit('close')
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await changePassword(form.old_password, form.new_password)
    ElMessage.success('密码修改成功')
    emit('success')
    handleClose()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '修改失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.force-tip {
  margin-bottom: 18px;
}
</style>
