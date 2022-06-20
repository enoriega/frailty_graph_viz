import React from 'react'

function EntitySearchResultItem({task}) {
  return (
    <div>{task.id.text}</div>
  )
}

export default EntitySearchResultItem