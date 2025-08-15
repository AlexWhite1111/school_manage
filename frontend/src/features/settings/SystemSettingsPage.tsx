import AppButton from '@/components/AppButton';
import React, { useState, useEffect } from 'react';
import { Table, Space, Tag, Switch, Select, message, Modal, Typography, Descriptions, Row, Col, Statistic, Divider, Input, Tabs, Card } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  UserOutlined,
  SafetyOutlined,
  SearchOutlined,
  SettingOutlined,
  KeyOutlined
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
import * as crmApi from '@/api/crmApi';
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
<div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
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

  // 跳转辅助：校验是否学生并已绑定客户
  const ensureStudentWithCustomer = (user: User): boolean => {
    if (user.role !== UserRole.STUDENT) {
      Modal.warning({
        title: '无法跳转',
        content: '仅学生用户支持跳转到客户档案或成长报告。',
      });
      return false;
    }
    if (!user.linkedCustomerId) {
      Modal.warning({
        title: '无法跳转',
        content: '该学生未绑定客户档案，无法跳转。',
      });
      return false;
    }
    return true;
  };

  const goToCrmProfile = async (user: User) => {
    if (!ensureStudentWithCustomer(user)) return;
    try {
      const customer = await crmApi.getCustomerById(user.linkedCustomerId!);
      navigate(`/crm/${customer.publicId}`);
    } catch (err) {
      console.error('跳转客户档案失败:', err);
      message.error('未找到对应客户档案');
    }
  };

  const goToGrowthReport = async (user: User) => {
    if (!ensureStudentWithCustomer(user)) return;
    try {
      const customer = await crmApi.getCustomerById(user.linkedCustomerId!);
      navigate(`/student-log/report/${customer.publicId}`);
    } catch (err) {
      console.error('跳转成长报告失败:', err);
      message.error('未找到对应学生成长报告');
    }
  };

  // 表格列配置（根据设备区分；已删除 ID 列）
  const desktopColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: User) => (
        <Space direction={'horizontal'} size="small">
          <Space onClick={() => goToCrmProfile(record)} style={{ cursor: 'pointer' }}>
            <UserOutlined />
            <Text strong style={{ fontSize: '14px' }}>
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
      render: (displayName: string, record: User) => (
        <Text style={{ fontSize: '14px', cursor: 'pointer' }} onClick={() => goToGrowthReport(record)}>
          {displayName || record.username}
        </Text>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole, record: User) => (
        record.role === UserRole.SUPER_ADMIN ? (
          <Text style={{ fontSize: '14px' }}>超管</Text>
        ) : (
          <Select
            value={role}
            style={{ width: 120 }}
            size={'middle'}
            onChange={(newRole) => handleRoleChange(record.id, newRole)}
            options={[
              { value: UserRole.MANAGER, label: '管理员' },
              { value: UserRole.TEACHER, label: '教师' },
              { value: UserRole.STUDENT, label: '学生' },
            ]}
          />
        )
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        <Text style={{ fontSize: '14px' }}>
          {email || '-'}
        </Text>
      ),
    },
    {
      title: '手机',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => (
        <Text style={{ fontSize: '14px' }}>
          {phone || '-'}
        </Text>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
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
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: User) => (
        <AppButton
          hierarchy="tertiary"
          size="sm"
          icon={<SafetyOutlined />}
          onClick={() => handleResetPassword(record.id, record.username)}
          disabled={record.role === UserRole.SUPER_ADMIN}
          style={{ fontSize: '14px' }}
        >
          重置密码
        </AppButton>
      ),
    },
  ];

  const mobileColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: '34%',
      ellipsis: true as any,
      render: (username: string, record: User) => (
        <Text
          strong
          onClick={() => goToCrmProfile(record)}
          style={{
            cursor: 'pointer',
            fontSize: '13px',
            display: 'inline-block',
            maxWidth: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {username}
        </Text>
      ),
    },
    {
      title: '昵称',
      dataIndex: 'displayName',
      key: 'displayName',
      width: '28%',
      ellipsis: true as any,
      render: (displayName: string, record: User) => (
        <Text
          onClick={() => goToGrowthReport(record)}
          style={{
            cursor: 'pointer',
            fontSize: '12px',
            display: 'inline-block',
            maxWidth: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {displayName || record.username}
        </Text>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: '22%',
      render: (role: UserRole, record: User) => (
        record.role === UserRole.SUPER_ADMIN ? (
          <Text style={{ fontSize: '12px' }}>超管</Text>
        ) : (
          <Select
            value={role}
            style={{ width: 78 }}
            size={'small'}
            onChange={(newRole) => handleRoleChange(record.id, newRole)}
            options={[
              { value: UserRole.MANAGER, label: '管理员' },
              { value: UserRole.TEACHER, label: '教师' },
              { value: UserRole.STUDENT, label: '学生' },
            ]}
          />
        )
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: '16%',
      render: (_: any, record: User) => (
        <AppButton
          hierarchy="tertiary"
          size="sm"
          icon={<KeyOutlined />}
          onClick={() => handleResetPassword(record.id, record.username)}
          disabled={record.role === UserRole.SUPER_ADMIN}
          style={{ fontSize: '12px', minWidth: 32, padding: 0 }}
        />
      ),
    },
  ];
  const columns = isMobile ? mobileColumns : desktopColumns;

  // 用户管理内容组件
  const UserManagementContent = () => (
    <>
      {/* 统计信息 */}
              <Row gutter={isMobile ? [16, 16] : [24, 24]} style={{ marginBottom: isMobile ? 16 : 24 }}>
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
                color: 'var(--ant-color-success)',
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
                color: 'var(--ant-color-error)',
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
        <div
          style={
            isMobile
              ? {
                  marginBottom: 12,
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 8,
                  alignItems: 'center',
                }
              : {
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                }
          }
        >
          {isMobile ? (
            <>
              <Input
                placeholder="搜索用户"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                allowClear
                style={{ width: '100%', gridColumn: '1 / -1' }}
                size="small"
                prefix={<SearchOutlined />}
              />
              <Select
                value={selectedRole}
                onChange={setSelectedRole}
                style={{ width: 120 }}
                size="small"
              >
                <Option value="ALL">全部用户</Option>
                <Option value={UserRole.SUPER_ADMIN}>超级管理员</Option>
                <Option value={UserRole.MANAGER}>管理员</Option>
                <Option value={UserRole.TEACHER}>教师</Option>
                <Option value={UserRole.STUDENT}>学生</Option>
              </Select>
              <AppButton icon={<ReloadOutlined />} onClick={loadUsers} loading={loading} size="small">
                刷新
              </AppButton>
              <AppButton hierarchy="primary" icon={<PlusOutlined />} onClick={() => navigate('/register')} size="small">
                新增
              </AppButton>
            </>
          ) : (
            <>
              <Space size="middle" wrap>
                <Select
                  value={selectedRole}
                  onChange={setSelectedRole}
                  style={{ width: 150 }}
                  size="middle"
                >
                  <Option value="ALL">全部用户</Option>
                  <Option value={UserRole.SUPER_ADMIN}>超级管理员</Option>
                  <Option value={UserRole.MANAGER}>管理员</Option>
                  <Option value={UserRole.TEACHER}>教师</Option>
                  <Option value={UserRole.STUDENT}>学生</Option>
                </Select>
              </Space>
              <Space size="middle" wrap>
                <Input
                  placeholder="搜索用户名、昵称、邮箱、手机号"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  allowClear
                  style={{ width: 280 }}
                  size="middle"
                  prefix={<SearchOutlined />}
                />
                <AppButton icon={<ReloadOutlined />} onClick={loadUsers} loading={loading} size="middle">
                  刷新
                </AppButton>
                <AppButton hierarchy="primary" icon={<PlusOutlined />} onClick={() => navigate('/register')} size="middle">
                  新增用户
                </AppButton>
              </Space>
            </>
          )}
        </div>

        <Table
          className={isMobile ? 'settings-user-table-mobile' : undefined}
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredUsers.length,
            pageSize: isMobile ? 8 : 10, // 移动端更紧凑，单页更多
            showSizeChanger: !isMobile,
            showQuickJumper: !isMobile,
            showTotal: (total) => `共 ${total} 个用户`,
            size: isMobile ? 'small' : undefined,
            simple: isMobile,
          }}
          tableLayout={isMobile ? 'fixed' : undefined}
          scroll={isMobile ? undefined : { x: 1000 }}
          size={isMobile ? 'small' : 'middle'}
        />
      </Card>
    </>
  );

  return (
    <div data-page-container>
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