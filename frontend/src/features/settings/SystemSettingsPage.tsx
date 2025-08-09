import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Switch, 
  Select, 
  message, 
  Modal, 
  Typography,
  Descriptions,
  Row,
  Col,
  Statistic,
  Divider,
  Input,
  Tabs
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  UserOutlined,
  SafetyOutlined,
  SearchOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { 
  getAllUsers, 
  getUsersByRole, 
  toggleUserActive, 
  updateUserRole, 
  resetUserPassword,
  UserRole,
  type User 
} from '@/api/authApi';
import { usePermissions } from '@/hooks/usePermissions';
import { useResponsive } from '@/hooks/useResponsive';
import GrowthConfigPanel from '@/components/growth/GrowthConfigPanel';

const { Title, Text } = Typography;
const { Option } = Select;

const SystemSettingsPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]); // 过滤后的用户列表
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | 'ALL'>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>(''); // 搜索关键词
  const navigate = useNavigate();
  const { isSuperAdmin, getRoleDisplayName } = usePermissions();
  const { isMobile } = useResponsive();

  // 权限检查
  if (!isSuperAdmin()) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Title level={3} type="danger">权限不足</Title>
        <Text>只有超级管理员才能访问系统设置</Text>
      </div>
    );
  }

  // 搜索和过滤逻辑
  useEffect(() => {
    let filtered = users;

    // 角色过滤
    if (selectedRole !== 'ALL') {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    // 搜索过滤
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(keyword) ||
        user.displayName?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword) ||
        user.phone?.toLowerCase().includes(keyword)
      );
    }

    setFilteredUsers(filtered);
  }, [users, selectedRole, searchKeyword]);

  // 加载用户列表
  const loadUsers = async () => {
    setLoading(true);
    try {
      const userData = await getAllUsers(); // 总是加载所有用户，然后前端过滤
      setUsers(userData);
    } catch (error) {
      console.error('加载用户列表失败:', error);
      message.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 切换用户激活状态
  const handleToggleActive = async (userId: number, isActive: boolean) => {
    try {
      await toggleUserActive(userId, isActive);
      message.success(`用户账号已${isActive ? '激活' : '停用'}`);
      loadUsers();
    } catch (error) {
      console.error('更新用户状态失败:', error);
      message.error('更新用户状态失败');
    }
  };

  // 更新用户角色
  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
      message.success('用户角色更新成功');
      loadUsers();
    } catch (error) {
      console.error('更新用户角色失败:', error);
      message.error('更新用户角色失败');
    }
  };

  // 重置用户密码
  const handleResetPassword = async (userId: number, username: string) => {
    Modal.confirm({
      title: '重置密码确认',
      content: `确定要重置用户 "${username}" 的密码为默认密码吗？`,
      onOk: async () => {
        try {
          await resetUserPassword(userId);
          message.success('密码已重置为默认密码：123456');
        } catch (error) {
          console.error('重置密码失败:', error);
          message.error('重置密码失败');
        }
      }
    });
  };

  // 统计数据
  const getUserStats = () => {
    const total = filteredUsers.length; // 使用过滤后的数据
    const active = filteredUsers.filter(u => u.isActive).length;
    const inactive = total - active;
    const roleStats = {
      [UserRole.SUPER_ADMIN]: filteredUsers.filter(u => u.role === UserRole.SUPER_ADMIN).length,
      [UserRole.MANAGER]: filteredUsers.filter(u => u.role === UserRole.MANAGER).length,
      [UserRole.TEACHER]: filteredUsers.filter(u => u.role === UserRole.TEACHER).length,
      [UserRole.STUDENT]: filteredUsers.filter(u => u.role === UserRole.STUDENT).length,
    };

    return { total, active, inactive, roleStats };
  };

  const stats = getUserStats();

  // 表格列配置
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      responsive: ['lg'] as any,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: User) => (
        <Space direction={isMobile ? 'vertical' : 'horizontal'} size="small">
          <Space>
            <UserOutlined />
            <Text strong style={{ fontSize: isMobile ? '13px' : '14px' }}>
              {username}
            </Text>
          </Space>
          {!record.isActive && <Tag color="red">已停用</Tag>}
        </Space>
      ),
    },
    {
      title: '昵称',
      dataIndex: 'displayName',
      key: 'displayName',
      responsive: ['md'] as any,
      render: (displayName: string, record: User) => (
        <Text style={{ fontSize: isMobile ? '12px' : '14px' }}>
          {displayName || record.username}
        </Text>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole, record: User) => (
        <Select
          value={role}
          style={{ width: isMobile ? 100 : 120 }}
          size={isMobile ? 'small' : 'middle'}
          onChange={(newRole) => handleRoleChange(record.id, newRole)}
          disabled={record.role === UserRole.SUPER_ADMIN}
        >
          <Option value={UserRole.MANAGER}>管理员</Option>
          <Option value={UserRole.TEACHER}>教师</Option>
          <Option value={UserRole.STUDENT}>学生</Option>
        </Select>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      responsive: ['lg'] as any,
      render: (email: string) => (
        <Text style={{ fontSize: isMobile ? '12px' : '14px' }}>
          {email || '-'}
        </Text>
      ),
    },
    {
      title: '手机',
      dataIndex: 'phone',
      key: 'phone',
      responsive: ['lg'] as any,
      render: (phone: string) => (
        <Text style={{ fontSize: isMobile ? '12px' : '14px' }}>
          {phone || '-'}
        </Text>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      responsive: ['xl'] as any,
      render: (date: string) => {
        if (!date) return '从未登录';
        return new Date(date).toLocaleString('zh-CN');
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean, record: User) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleToggleActive(record.id, checked)}
          disabled={record.role === UserRole.SUPER_ADMIN}
          checkedChildren="启用"
          unCheckedChildren="停用"
          size={isMobile ? 'small' : 'default'}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: isMobile ? 80 : 120,
      render: (_: any, record: User) => (
        <Button
          type="text"
          size="small"
          icon={<SafetyOutlined />}
          onClick={() => handleResetPassword(record.id, record.username)}
          disabled={record.role === UserRole.SUPER_ADMIN}
          style={{ fontSize: isMobile ? '12px' : '14px' }}
        >
          {isMobile ? '重置' : '重置密码'}
        </Button>
      ),
    },
  ];

  // 用户管理内容组件
  const UserManagementContent = () => (
    <>
      {/* 统计信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: isMobile ? 16 : 24 }}>
        <Col xs={12} sm={6} lg={6}>
          <Card size={isMobile ? 'small' : 'default'}>
            <Statistic 
              title="总用户数" 
              value={stats.total} 
              prefix={<UserOutlined />}
              valueStyle={{ fontSize: isMobile ? '18px' : '24px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card size={isMobile ? 'small' : 'default'}>
            <Statistic 
              title="活跃用户" 
              value={stats.active} 
              valueStyle={{ 
                color: '#3f8600',
                fontSize: isMobile ? '18px' : '24px'
              }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card size={isMobile ? 'small' : 'default'}>
            <Statistic 
              title="停用用户" 
              value={stats.inactive} 
              valueStyle={{ 
                color: '#cf1322',
                fontSize: isMobile ? '18px' : '24px'
              }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={6}>
          <Card size={isMobile ? 'small' : 'default'}>
            <Descriptions 
              title="角色分布" 
              size="small" 
              column={1}
              labelStyle={{ fontSize: isMobile ? '11px' : '12px' }}
              contentStyle={{ fontSize: isMobile ? '11px' : '12px' }}
            >
              <Descriptions.Item label="超管">{stats.roleStats[UserRole.SUPER_ADMIN]}</Descriptions.Item>
              <Descriptions.Item label="管理员">{stats.roleStats[UserRole.MANAGER]}</Descriptions.Item>
              <Descriptions.Item label="教师">{stats.roleStats[UserRole.TEACHER]}</Descriptions.Item>
              <Descriptions.Item label="学生">{stats.roleStats[UserRole.STUDENT]}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* 用户管理 */}
      <Card title="用户管理" size={isMobile ? 'small' : 'default'}>
        <div style={{ 
          marginBottom: 16, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: 16 
        }}>
          <Space size="middle" wrap>
            <Text style={{ fontSize: isMobile ? '13px' : '14px' }}>角色筛选：</Text>
            <Select
              value={selectedRole}
              onChange={setSelectedRole}
              style={{ width: isMobile ? 120 : 150 }}
              size={isMobile ? 'small' : 'middle'}
            >
              <Option value="ALL">全部用户</Option>
              <Option value={UserRole.SUPER_ADMIN}>超级管理员</Option>
              <Option value={UserRole.MANAGER}>管理员</Option>
              <Option value={UserRole.TEACHER}>教师</Option>
              <Option value={UserRole.STUDENT}>学生</Option>
            </Select>
          </Space>

          <Space size="middle" wrap style={{ width: isMobile ? '100%' : 'auto' }}>
            <Input
              placeholder={isMobile ? "搜索用户" : "搜索用户名、昵称、邮箱、手机号"}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              style={{ width: isMobile ? '100%' : 280 }}
              size={isMobile ? 'small' : 'middle'}
              prefix={<SearchOutlined />}
            />
            <Button 
              icon={<ReloadOutlined />}
              onClick={loadUsers}
              loading={loading}
              size={isMobile ? 'small' : 'middle'}
            >
              {isMobile ? '刷新' : '刷新'}
            </Button>
            <Button 
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/register')}
              size={isMobile ? 'small' : 'middle'}
            >
              {isMobile ? '新增' : '新增用户'}
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredUsers} // 使用 filteredUsers 作为数据源
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredUsers.length, // 显示过滤后的总数
            pageSize: isMobile ? 5 : 10,
            showSizeChanger: !isMobile,
            showQuickJumper: !isMobile,
            showTotal: (total) => `共 ${total} 个用户`,
            size: isMobile ? 'small' : undefined,
            simple: isMobile,
          }}
          scroll={{ x: isMobile ? 800 : 1000 }}
          size={isMobile ? 'small' : 'middle'}
        />
      </Card>
    </>
  );

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <Title level={2} style={{ fontSize: isMobile ? '20px' : '28px' }}>
        系统设置
      </Title>
      
      <Tabs
        defaultActiveKey="users"
        items={[
          {
            key: 'users',
            label: (
              <Space>
                <UserOutlined />
                用户管理
              </Space>
            ),
            children: <UserManagementContent />
          },
          {
            key: 'growth-config',
            label: (
              <Space>
                <SettingOutlined />
                成长分析设置
              </Space>
            ),
            children: <GrowthConfigPanel />
          }
        ]}
      />
    </div>
  );
};

export default SystemSettingsPage; 