import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext({
  operator: { id: 'op_01', name: 'Rao (Lead Agronomist)', role: 'FARM_OPERATOR' },
});

export function AuthProvider({ children }) {
  const [operator, setOperator] = useState({
    id: 'op_01',
    name: 'Rao (Lead Agronomist)',
    role: 'FARM_OPERATOR',
  });

  return (
    <AuthContext.Provider value={{ operator, setOperator }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
