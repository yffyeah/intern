import { useState } from 'react';

const Pagination = ({ currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }) => {
  const [jumpPage, setJumpPage] = useState('');
  
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const handleJumpPage = () => {
    const page = parseInt(jumpPage);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpPage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJumpPage();
    }
  };

  if (totalPages <= 1 && !onPageSizeChange) return null;

  return (
    <div className="flex items-center justify-between mt-4 px-2 flex-wrap gap-4">
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-500">
          显示第 {startItem} - {endItem} 条，共 {totalItems} 条
        </div>
        
        {onPageSizeChange && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          上一页
        </button>
        
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              page === currentPage
                ? 'bg-indigo-600 text-white'
                : page === '...'
                ? 'cursor-default'
                : 'hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
        >
          下一页
        </button>
        
        {totalPages > 1 && (
          <div className="flex items-center space-x-2 ml-2">
            <span className="text-sm text-gray-500">跳至</span>
            <input
              type="number"
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyPress={handleKeyPress}
              min={1}
              max={totalPages}
              className="w-14 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-center"
              placeholder={currentPage}
            />
            <span className="text-sm text-gray-500">页</span>
            <button
              onClick={handleJumpPage}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-all"
            >
              跳转
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pagination;
