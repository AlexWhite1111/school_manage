// 简单的认证系统测试脚本
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testAuthSystem() {
  console.log('🧪 开始测试认证系统...\n');

  try {
    // 1. 测试登录
    console.log('1️⃣ 测试登录...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 超级管理员登录成功');
    console.log(`Token: ${token.substring(0, 20)}...`);

    // 2. 测试获取用户信息
    console.log('\n2️⃣ 测试获取用户信息...');
    const userResponse = await axios.get(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 用户信息获取成功');
    console.log(`用户: ${userResponse.data.username} (${userResponse.data.role})`);

    // 3. 测试获取所有用户列表
    console.log('\n3️⃣ 测试获取用户列表...');
    const usersResponse = await axios.get(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 用户列表获取成功');
    console.log(`总用户数: ${usersResponse.data.length}`);
    usersResponse.data.forEach(user => {
      console.log(`  - ${user.username} (${user.role}) ${user.isActive ? '✅' : '❌'}`);
    });

    // 4. 测试注册新用户
    console.log('\n4️⃣ 测试注册新用户...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
        username: 'test_teacher',
        password: 'test123',
        email: 'teacher@test.com',
        role: 'TEACHER'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ 新用户注册成功');
      console.log(`新用户: ${registerResponse.data.user.username}`);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('ℹ️ 用户已存在，跳过注册');
      } else {
        throw error;
      }
    }

    // 5. 测试忘记密码
    console.log('\n5️⃣ 测试忘记密码...');
    const forgotResponse = await axios.post(`${BASE_URL}/auth/forgot-password`, {
      identifier: 'admin'
    });
    
    console.log('✅ 密码重置令牌生成成功');
    const resetToken = forgotResponse.data.resetToken;
    console.log(`重置令牌: ${resetToken.substring(0, 20)}...`);

    // 6. 测试重置密码
    console.log('\n6️⃣ 测试重置密码...');
    await axios.post(`${BASE_URL}/auth/reset-password`, {
      resetToken: resetToken,
      newPassword: '123456'  // 重置为原密码
    });
    
    console.log('✅ 密码重置成功');

    // 7. 测试教师登录
    console.log('\n7️⃣ 测试教师登录...');
    const teacherLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'teacher',
      password: '123456'
    });
    
    console.log('✅ 教师登录成功');
    const teacherToken = teacherLoginResponse.data.token;

    // 8. 测试教师权限（应该无法访问用户管理）
    console.log('\n8️⃣ 测试教师权限限制...');
    try {
      await axios.get(`${BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${teacherToken}` }
      });
      console.log('❌ 教师不应该能访问用户列表');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ 教师权限限制正常工作');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 所有测试通过！认证系统工作正常。');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testAuthSystem(); 