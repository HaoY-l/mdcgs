<template>
  <div class="force-change-page">
    <div class="change-card">
      <div class="card-header">
        <h2>修改密码</h2>
        <p>您使用的是初始密码，为保障账号安全，必须修改密码后才能继续使用系统</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="原密码" prop="old_password">
          <el-input v-model="form.old_password" type="password" show-password placeholder="请输入原密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="new_password">
          <el-input v-model="form.new_password" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm_password">
          <el-input v-model="form.confirm_password" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <div class="card-footer">
        <el-button type="primary" size="large" :loading="loading" @click="handleSubmit">
          确认修改
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { changePassword } from '@/api/auth'

const router = useRouter()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  old_password: 'admin123',
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

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await changePassword(form.old_password, form.new_password)
    ElMessage.success('密码修改成功，现在可以正常使用系统')
    router.push('/')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '修改失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.force-change-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
}
.change-card {
  width: 480px;
  padding: 40px;
  background: #1e293b;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.06);
}
.card-header h2 {
  color: #fff;
  margin: 0 0 12px;
  font-size: 24px;
}
.card-header p {
  color: #94a3b8;
  margin: 0 0 24px;
  font-size: 14px;
  line-height: 1.5;
}
.card-footer {
  margin-top: 24px;
}
.card-footer .el-button {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
}
:deep(.el-input__wrapper) {
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: none;
  border-radius: 8px;
}
:deep(.el-input__inner) {
  color: #e2e8f0;
  height: 40px;
}
</style>
