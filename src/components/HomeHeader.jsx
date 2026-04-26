import { startTransition } from 'react'
import { ALL_CATEGORIES } from '../lib/constants'

function HomeHeader({
  categories,
  searchQuery,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
}) {
  return (
    <header className="home-header" aria-label="PsyVault header">
      <div className="home-header-inner">
        <div className="home-header-title-row">
          <h1 className="library-title home-header-title">PsyVault</h1>
        </div>

        <div className="home-header-controls-row">
          <div className="home-header-search">
            <input
              aria-label="Search books by title or author"
              className="input library-search"
              type="search"
              placeholder="Search title or author"
              value={searchQuery}
              onChange={(event) => {
                const { value } = event.target
                startTransition(() => {
                  onSearchChange(value)
                })
              }}
            />
          </div>

          <div className="home-header-filter">
            <select
              aria-label="Filter by category"
              className="select library-filter"
              value={selectedCategory}
              onChange={(event) => {
                const { value } = event.target
                startTransition(() => {
                  onCategoryChange(value)
                })
              }}
            >
              <option value={ALL_CATEGORIES}>{ALL_CATEGORIES}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  )
}

export default HomeHeader
